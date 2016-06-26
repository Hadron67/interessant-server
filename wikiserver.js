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
function Request(r){
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
Request.prototype.listen = function(cb){
  var a = '';
  var parent = this;
  this._r.addListener('data', function (pdata) {
    a += pdata;
  }).addListener('end', function (pdata) {
    parent.POST = qs.parse(a);
    if(cb)
      cb.call(parent);
  });
}

function Response(re){
  this._re = re;
  this.content_type = 'text/html';
  this.statuscode = 200;
  this.cookies = undefined;
  this.content = '';
  this.encoding = 'utf8';
  this.jsonobj = {};
}
Response.prototype.end = function(){
  var head = {
    'Content-Type' : this.content_type
  };
  if(this.cookies){
    var s = '';
    for(key in this.cookies){
      s += key + '=' + this.cookies[key] + ';';
    }
    s += 'HttpOnly';
    head['Set-Cookie'] = s;
  }
  this._re.writeHead(this.statuscode,head);
  switch(this.content_type){
    case 'application/json':
      this.content = JSON.stringify(this.jsonobj);
  }

  this._re.write(this.content,this.encoding);
  this._re.end();
  return this;
}
Response.prototype.string = function(s){
  this.content += s;
  return this;
}
Response.prototype.file = function(s){
  this.content = s;
  this.encoding = 'binary';
  return this;
}
Response.prototype.status = function(s){
  this.statuscode = s;
  return this;
}
Response.prototype.contenttype = function(t){
  this.content_type = t;
  return this;
}
Response.prototype.cookie = function(key,value){
  this.cookies = this.cookies || {};
  this.cookie[key] = value;
}
Response.prototype.addjson = function(key,value){
  this.jsonobj[key] = value;
  this.content_type = 'application/json';
  this.encoding = 'utf8';
  return this;
}
Response.prototype.json = function(obj){
  this.jsonobj = obj;
  this.content_type = 'application/json';
  this.encoding = 'utf8';
  return this;
}
Response.prototype.err = function(msg){
  this.jsonobj.success = 0;
  this.jsonobj.msg = msg;
  this.content_type = 'application/json';
  this.encoding = 'utf8';
  return this;
}
Response.prototype.ok = function(){
  this.jsonobj.success = 1;
  this.content_type = 'application/json';
  this.encoding = 'utf8';
  return this;
}


function Sessionmgr(){
  this.sessions = {};
  this.timers = {};
}
Sessionmgr.prototype.generateSession = function(timeout,cb){
  crypto.randomBytes(16, function (ex, buf) {
    var ssid = buf.toString('hex');
    var ret = this.sessions[ssid] = {};
    var parent = this;

    if(timeout) this.timers[ssid] = setTimeout(function(){
      delete parent.sessions[ssid];
      delete parent.timers[ssid];
    },timeout);
    if(cb)
      cb(ssid,ret);
  });
}
Sessionmgr.prototype.getSession = function(ssid,timeout){
  var ret;
  var parent = this;
  if(ret = this.sessions[ssid]){
    clearTimeout(this.timers[ssid]);
    this.timers[ssid] = setTimeout(function () {
      delete parent.sessions[ssid];
      delete parent.timers[ssid];
    }, timeout);
  }
  else {
    ret = this.sessions[ssid] = {};
    var parent = this;

    if (timeout) this.timers[ssid] = setTimeout(function () {
      delete parent.sessions[ssid];
      delete parent.timers[ssid];
    }, timeout);
  }
  return ret;
}

function Server(){
  this.config = JSON.parse(fs.readFileSync('serverconfig.json','utf-8'));
  this.DB = new wmgr.WikiDB();
  this.DB.open();
  this._sessions = {};
  this.session = {};
  this.sessionmgr = new Sessionmgr();
  this._route = {};
  routeur.initRoutes(this);
  var parent = this;
	this.server = http.createServer(function servercb(request,response){
    var pathname = url.parse(request.url).pathname;
    if (pathname.charAt(pathname.length - 1) == "/") {
      pathname += parent.config.defaultFile;
    }
    var req = new Request(request);
    req.listen(function(){
      var ssid,session;
      if(!(ssid = this.cookies['SSID']))
        parent.sessionmgr.generateSession(parent.config['session-timeout'], function (ssid,session) {
          
          req.session = session;
          var res = new Response(response);
          res.cookie('SSID',ssid);
          parent._doRoute(pathname,req,res);
        });
      else{

        req.session = parent.sessionmgr.getSession(ssid,parent.config['session-timeout']);
        parent._doRoute(pathname,req, new Response(response));
      }
    });
  });
}

Server.prototype.addRoute = function(path,func){
  var r = this._route;
  var p = path.split('/');
  var i;
  for(i = 1;i < p.length - 1;i++){
    if(r[p[i]]){
      r = r[p[i]];
    }
    else{
      r = r[p[i]] = {};
    }
  }
  r[p[i]] = func;
}
Server.prototype._doRoute = function(path,request,response){
  var p = path.split('/');
  var r = this._route;
  var found = false;
  out:
  for(var i = 1;i < p.length;i++){
    r = r[p[i]];
    switch(typeof r){
      case 'undefined':
        this.sendFile(path,response);
        found = true;
        break out;
      case 'function':
        r.call(this,request,response);
        found = true;
        break out;
    }
  }
  if(!found){
    response.status(404)
      .contenttype('text/plain')
      .string("This request URL " + path + " was not found on this server.")
      .end();
  }
}

Server.prototype.sendFile = function (pathname, response) {
  var realpath = path.join(this.config.root,pathname);
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


Server.prototype.start = function(){
	this.server.listen(this.config.port);
	console.log('start listening at port ' + this.config.port);
}

Server.prototype.doPost = function (pname,cookies,data,response){
  var addr = cookies['SSID'] || '';
  var parent = this;
  function writeResponseWithCookie(cookie,obj){
    response.writeHead(200,{
      'Content-Type': 'application/json',
      'Set-Cookie': cookie + 'HttpOnly'
    });
    response.write(JSON.stringify(obj),'utf-8');
    response.end();
  }
  function writeResponse(obj){
    response.writeHead(200,{
      'Content-Type': 'application/json'
    });
    response.write(JSON.stringify(obj),'utf-8');
    response.end();
  }
  function writeErrResponse(msg){
    response.writeHead(200,{
      'Content-Type': 'application/json'
    });
    response.write('{"success":"0","msg":"' + msg + '"}','utf-8');
    response.end();
  }
  function writeOkResponse(){
    response.writeHead(200,{
      'Content-Type': 'application/json'
    });
    response.write('{"success":"1"}','utf-8');
    response.end();
  }
  
  switch(pname){
    case '/login':
      var msg = '查无此人';
      if(this.DB.userExists(data['user'])){
        msg = '登录密码错误';
      }
      var user = this.DB.getUser(data['user'],data['pass']);
      var res;
      if(!user){
        res = {
          success: 0,
          msg : msg
        };
        writeResponse(res);
      }
      else{
        res = {
          success: 1
        };
        crypto.randomBytes(16, function(ex, buf) {  
          var token = buf.toString('hex');  
          parent._sessions[token] = user;
          writeResponseWithCookie('SSID=' + token + ';',res);
          console.log('user "' + data['user'] +'" logged in with SSID ' + token);
        });
      }
      break;
    case '/logout':
      delete this._sessions[addr];
      writeOkResponse();
      break;
    case '/getuser':
      var user = this._sessions[addr];
      var res;
      if(user){
        res = {
          success : 1,
          username : user.name,
        };
      }
      else{
        res = {
          success : 0,
          username : '',
          msg : '还没登录，所以锁尔了'
        };
      }
      writeResponse(res);
      break;
    case '/getallwords':
      var user = this._sessions[addr];
      var res = {};
      if(user){
        res.success = 1,
        res.data = user.getAllWords();
      }
      else{
        res.success = 0;
        res.msg = '还没登录，所以锁尔了';
      }
      writeResponse(res);
      break;
    case '/edit':
      var user = this._sessions[addr];
      if(!user){
        writeErrResponse("还没登录，统统锁尔");
      }
      else{
        user.draft(data['type'],data['data']);
        this.DB.checkBackup(function () {
          writeOkResponse();
        });
      }
      break;
    case '/getdrafts':
      var user = this._sessions[addr];
      if(!user){
        writeErrResponse("还没登录，统统锁尔");
      }
      else{
        var res = {};
        res.drafts = user.getAllDrafts();
        res.current_draft = user.getCurrentDraft();
        res.success = 1;
        writeResponse(res);
      }
      break;
    case '/updatedraft':
      var user = this._sessions[addr];
      if(!user){
        writeErrResponse("还没登录，统统锁尔");
      }
      else{
        var res = {};
        user.updateDraft(data['type'],data['identifier'],data['content']);
        this.DB.checkBackup(function(){
          writeOkResponse();
        });
      }
      break;
    case '/closedraft':
      var user = this._sessions[addr];
      if(!user){
        writeErrResponse("还没登录，统统锁尔");
      }
      else{
        var res = {};
        user.closeDraft(data['type'],data['identifier']);
        this.DB.checkBackup(function(){
          writeOkResponse();
        });
      }
      break;
    case '/commitdraft':
      var user = this._sessions[addr];
      if(!user){
        writeErrResponse("还没登录，统统锁尔");
      }
      else{
        var res = {};
        user.updateDraft(data['type'],data['identifier'],data['content']);
        user.commitDraft(data['type'],data['identifier'],data['content']);
        this.DB.checkBackup(function(){
          writeOkResponse();
        });
      }
      break;
    case '/getallpages':
      var user = this._sessions[addr];
      if(!user){
        writeErrResponse("还没登录，统统锁尔");
      }
      else{
        var res = {};
        res.data = user.getAllPages();
        res.success = 1;
        writeResponse(res);
      }
      break;
    case '/getredir':
      var user = this._sessions[addr];
      if(!user){
        writeErrResponse("还没登录，统统锁尔");
      }
      else{
        
      }


    case '/updateredir':
      var user = this._sessions[addr];
      if(!user){
        writeErrResponse("还没登录，统统锁尔");
      }
      else{
        user.updateRedir(res['index'],res['key'],res['value']);
        this.DB.checkBackup(function(){
          writeOkResponse();
        });
      }
      break;
    case '/new':
      var user = this._sessions[addr];
      if(!user){
        writeErrResponse("还没登录，统统锁尔");
      }
      else if(!data['type']){
        writeErrResponse('请求错误');
      }
      else if(data['type'] == 'word' && this.DB.wordExists(data['data'])){
        writeErrResponse('词条“' + data['data'] + '”已存在或被重定向，请重新添加。');
      }
      else if(data['type'] == 'page' && this.DB.pageExists(data['data'])){
        writeErrResponse('页面“' + data['data'] + '”已存在，请重新添加。');
      }
      else if(data['data'] == ''){
        writeErrResponse('锁尔空白的词条名或页面名');
      }
      else{
        user.draft(data['type'],data['data']);
        this.DB.checkBackup(function(){
          writeOkResponse();
        });
      }
      break;
    case '/delete':
      var user = this._sessions[addr];
      if(!user){
        writeErrResponse("还没登录，统统锁尔");
      }
      else if(!checkArg(data,['type','identifier'])){
        writeErrResponse('请求错误');
      }
      else {
        user.DeleteItem(data['type'],data['identifier']);
        user.closeDraft(data['type'],data['identifier']);
        this.DB.checkBackup(function(){
          writeOkResponse();
        });
      }
      break;
    case '/export':
      var user = this._sessions[addr];
      if(!user){
        writeErrResponse("还没登录，统统锁尔");
      }
      else if(!checkArg(data,['what'])){
        writeErrResponse('请求错误');
      }
      else{
        switch(data['what']){
          case 'maindb':
            user.exportMainDB(function(){
              writeOkResponse();
            });
            break;

        }
      }
      break;
  }
}

exports.WikiServer = Server;