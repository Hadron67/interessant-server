'use strict';

var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');
var qs = require('querystring');
var crypto = require('crypto');

var wmgr = require('./wikimgr.js');

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

var Server = function(){
	// this.config = {
	// 	port : 8080,
	// 	root : './www',
  //   defaultFile : 'index.html'
	// };
  this.config = JSON.parse(fs.readFileSync('config.json','utf-8'));
  this.DB = new wmgr.WikiDB();
  this.DB.open();
  this._sessions = {};
  var parent = this;
	this.server = http.createServer(function servercb(request,response){
    var pathname = url.parse(request.url).pathname;
    if (pathname.charAt(pathname.length - 1) == "/") {
      pathname += parent.config.defaultFile;
    }
    //console.log(request.connection.remoteAddress);
    var realpath = path.join(parent.config.root,pathname);
    //console.log(realpath);
    var ext = path.extname(realpath);
    switch(request.method){
      case 'GET':
        fs.exists(realpath,function(exists){
          if(!exists){
            response.writeHead(404, {
              'Content-Type': 'text/plain'
            });
            response.write("This request URL " + pathname + " was not found on this server.");
            response.end();
          }
          else{
            fs.readFile(realpath,'binary',function(err,file){
              if(err){
                response.writeHead(500, {
                  'Content-Type': 'text/plain',
                });
                response.write('internal erreur:\n' + err);
                response.end();
              }
              else{
                response.writeHead(200,{
                  'Content-Type' : contentTypes[ext] || 'text/plain'
                });
                response.write(file,'binary');
                response.end();
              }
            });
          }
        });
        break;
      case 'POST':
        var a = '';
        var cookies = {};
        request.headers.cookie && request.headers.cookie.split(';').forEach(function( Cookie ) {
            var parts = Cookie.split('=');
            cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
        });
        request.addListener('data',function(pdata){
          a += pdata;
        }).addListener('end',function(pdata){
          parent.doPost(pathname,cookies,qs.parse(a),response);
        });
        console.log('post:' + pathname);
        break;
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
        writeResponse({success:1});
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
    case '/getallredir':
      var user = this._sessions[addr];
      if(!user){
        writeErrResponse("还没登录，统统锁尔");
      }
      else{
        var res = {};
        res.data = user.getAllredir();
        res.success = 1;
        writeResponse(res);
      }
      break;
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
        writeErrResponse('词条“' + data['data'] + '”已存在，请重新添加。');
      }
      else if(data['type'] == 'page' && this.DB.pageExists(data['data'])){
        writeErrResponse('页面“' + data['data'] + '”已存在，请重新添加。');
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
        user.Delete(data['type'],data['identifier']);
        user.closeDraft(data['type'],data['identifier']);
        this.DB.checkBackup(function(){
          writeOkResponse();
        });
      }
      break;
  }
}

function checkArg(data,array){
  for(var i = 0;i < array.length;i++){
    if(data[array[i]] == undefined)
      return false;
  }
  return true;
}

exports.WikiServer = Server;