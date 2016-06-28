'use strict';

var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');
var qs = require('querystring');
var crypto = require('crypto');

var wmgr = require('./wikimgr.js');
var routeur = require('./routeur.js');

var contentTypes = {
  ".css": "text/css",
  ".gif": "image/gif",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript",
  ".json": "application/json",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".swf": "application/x-shockwave-flash",
  ".tiff": "image/tiff",
  ".txt": "text/plain",
  ".wav": "audio/x-wav",
  ".wma": "audio/x-ms-wma",
  ".wmv": "video/x-ms-wmv",
  ".xml": "text/xml",
  '.cdf': 'application/vnd.wolfram.cdf.text'
};
function Request(r) {
  var cookies = {};
  r.headers.cookie && r.headers.cookie.split(';').forEach(function (Cookie) {
    var parts = Cookie.split('=');
    cookies[parts[0].trim()] = (parts[1] || '').trim();
  });
  this.cookies = cookies;
  this.method = r.method;
  this._r = r;
  this.POST = {};
  this.session = {};
}
Request.prototype.listen = function (cb) {
  var a = '';
  var parent = this;
  this._r.addListener('data', function (pdata) {
    a += pdata;
  }).addListener('end', function (pdata) {
    parent.POST = qs.parse(a);
    if (cb)
      cb.call(parent);
  });
}

function Response(re) {
  this._re = re;
  this.content_type = 'text/html';
  this.statuscode = 200;
  this.cookies = undefined;
  this.content = '';
  this.encoding = 'utf8';
  this.jsonobj = {};
}
Response.prototype.end = function () {
  var head = {
    'Content-Type': this.content_type
  };
  if (this.cookies) {
    var s = '';
    for (var key in this.cookies) {
      s += key + '=' + this.cookies[key] + ';';
    }
    s += 'HttpOnly';
    head['Set-Cookie'] = s;
  }
  this._re.writeHead(this.statuscode, head);
  switch (this.content_type) {
    case 'application/json':
      this.content = JSON.stringify(this.jsonobj);
  }

  this._re.write(this.content, this.encoding);
  this._re.end();
  return this;
}
Response.prototype.string = function (s) {
  this.content += s;
  return this;
}
Response.prototype.file = function (s) {
  this.content = s;
  this.encoding = 'binary';
  return this;
}
Response.prototype.status = function (s) {
  this.statuscode = s;
  return this;
}
Response.prototype.contenttype = function (t) {
  this.content_type = t;
  return this;
}
Response.prototype.cookie = function (key, value) {
  this.cookies = this.cookies || {};
  this.cookies[key] = value;
}
Response.prototype.addjson = function (key, value) {
  this.jsonobj[key] = value;
  this.content_type = 'application/json';
  this.encoding = 'utf8';
  return this;
}
Response.prototype.json = function (obj) {
  this.jsonobj = obj;
  this.content_type = 'application/json';
  this.encoding = 'utf8';
  return this;
}
Response.prototype.err = function (msg) {
  this.jsonobj.success = 0;
  this.jsonobj.msg = msg;
  this.content_type = 'application/json';
  this.encoding = 'utf8';
  return this;
}
Response.prototype.ok = function () {
  this.jsonobj.success = 1;
  this.content_type = 'application/json';
  this.encoding = 'utf8';
  return this;
}


function Sessionmgr() {
  this.sessions = {};
  this.timers = {};
}

Sessionmgr.prototype.generateSession = function (timeout, cb) {
  var parent = this;

  crypto.randomBytes(16, function (ex, buf) {
    var ssid = buf.toString('hex');
    var ret = parent.sessions[ssid] = {};

    if (timeout) parent.timers[ssid] = setTimeout(parent.getTimerFunc(), timeout);
    if (cb)
      cb(ssid, ret);
  });
}
Sessionmgr.prototype.getSession = function (ssid, timeout) {
  var ret;
  var parent = this;
  if (ret = this.sessions[ssid]) {
    clearTimeout(this.timers[ssid]);
    this.timers[ssid] = setTimeout(this.getTimerFunc(), timeout);
  }
  else {
    ret = this.sessions[ssid] = {};
    var parent = this;

    if (timeout) this.timers[ssid] = setTimeout(this.getTimerFunc(), timeout);
  }
  return ret;
}
Sessionmgr.prototype.getTimerFunc = function(ssid){
  var parent = this;
  return function(){
    delete parent.sessions[ssid];
    delete parent.timers[ssid];
  }
}

function Router(){
  this._root = new Router.RouterItem();
  
}
Router.prototype.addRoute = function(path,func){
  path = path.split('/');
  var r = this._root;
  for(var i = 1;i < path.length;i++){
    var node = path[i];
    r.subroutes[node] = r.subroutes[node] || new Router.RouterItem();
    r = r.subroutes[node];
  }
  r.func = func;
}
Router.prototype.findRoute = function(path){
  path = path.split('/');
  var r = this._root;
  for(var i = 1;i < path.length;i++){
    r = r.subroutes[path[i]];
    if(!r){
      return undefined;
    }
  }
  return r.func;
}
Router.RouterItem = function(){
  this.func = undefined;
  this.subroutes = {};
}

function Server() {
  this.config = JSON.parse(fs.readFileSync('serverconfig.json', 'utf-8'));
  this.DB = new wmgr.WikiDB();
  this.DB.open();
  this.sessionmgr = new Sessionmgr();
  this._router = new Router();
  routeur.initRoutes(this);
  var parent = this;
  this.server = http.createServer(function servercb(request, response) {
    var pathname = url.parse(request.url).pathname;
    if (pathname.charAt(pathname.length - 1) == "/") {
      pathname += parent.config.defaultFile;
    }
    var req = new Request(request);
    req.listen(function () {
      var ssid, session;
      if (!(ssid = this.cookies['SSID']))
        parent.sessionmgr.generateSession(parent.config['session-timeout'], function (ssid, session) {

          req.session = session;
          var res = new Response(response);
          res.cookie('SSID', ssid);
          parent._doRoute(pathname, req, res);
        });
      else {
        req.session = parent.sessionmgr.getSession(ssid, parent.config['session-timeout']);
        parent._doRoute(pathname, req, new Response(response));
      }
    });
  });
}

Server.prototype.addRoute = function (path, func) {
  this._router.addRoute(path,func);
}
Server.prototype._doRoute = function (path, request, response) {
  var routeFunc = this._router.findRoute(path);
  if(!routeFunc){
    this.sendFile(path, response);
  }
  else{
    routeFunc.call(this,request,response);
  }
}

Server.prototype.sendFile = function (pathname, response) {
  var realpath = path.join(this.config.root, pathname);
  var ext = path.extname(realpath);
  fs.exists(realpath, function (exists) {
    if (!exists) {
      response.status(404)
        .contenttype('text/plain')
        .string("This request URL " + pathname + " was not found on this server.")
        .end();
    }
    else {
      fs.readFile(realpath, 'binary', function (err, file) {
        if (err) {
          response.status(500)
            .contenttype('text/plain')
            .string('internal erreur:\n' + err)
            .end();
        }
        else {
          response.status(200)
            .contenttype(contentTypes[ext] || 'text/plain')
            .file(file)
            .end();
        }
      });
    }
  });
}

Server.prototype.start = function () {
  this.server.listen(this.config.port);
  console.log('start listening at port ' + this.config.port);
}

exports.WikiServer = Server;