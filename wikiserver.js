'use strict';

var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');
var wmgr = require('./wikimgr.js');
var qs = require('querystring');

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
	this.config = {
		port : 8080,
		root : './www',
    defaultFile : 'index.html'
	};
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
                  'Content-Type': 'text/plain'
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
        request.addListener('data',function(pdata){
          a += pdata;
        }).addListener('end',function(pdata){
          parent.doPost(pathname,request.connection.remoteAddress,qs.parse(a),response);
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

Server.prototype.doPost = function (pname,addr,data,response){
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
      }
      else{
        res = {
          success: 1
        };
        this._sessions[addr] = user;
        console.log('user "' + data['user'] +'" logged in at ' + addr);
      }
      response.write(JSON.stringify(res),'utf-8');
      response.end();
      break;
    case '/logout':
      delete this._sessions[addr];
      response.write('{"success":"1"}','utf-8');
      response.end();
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
      response.write(JSON.stringify(res),'utf-8');
      response.end();
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
      response.write(JSON.stringify(res),'utf-8');
      response.end();
      break;
    case '/edit':
      var user = this._sessions[addr];
      if(!user){
        response.write('{"success":"0","msg":"还没登录，统统锁尔"}','utf-8');
        response.end();
      }
      else{
        user.draft(data['type'],data['data']);
        response.write('{"success":"1"}','utf-8');
        response.end();
      }
      break;
    case '/getdrafts':
      var user = this._sessions[addr];
      if(!user){
        response.write('{"success":"0","msg":"还没登录，统统锁尔"}','utf-8');
        response.end();
      }
      else{
        var res = {};
        res.drafts = user.getAllDrafts();
        res.current_draft = user.getCurrentDraft();
        res.success = 1;
        response.write(JSON.stringify(res),'utf-8');
        response.end();
      }
      break;
    case '/updatedraft':
      var user = this._sessions[addr];
      if(!user){
        response.write('{"success":"0","msg":"还没登录，统统锁尔"}','utf-8');
        response.end();
      }
      else{
        var res = {};
        user.updateDraft(data['type'],data['identifier'],data['content']);
        this.DB.checkBackup(function(){
          console.log(data['type'] + data['identifier'] + data['content']);
          response.write('{"success":"1"}','utf-8');
          response.end();
        });
      }
      break;
    case '/closedraft':
      var user = this._sessions[addr];
      if(!user){
        response.write('{"success":"0","msg":"还没登录，统统锁尔"}','utf-8');
        response.end();
      }
      else{
        var res = {};
        user.closeDraft(data['type'],data['identifier']);
        this.DB.checkBackup(function(){
          response.write('{"success":"1"}','utf-8');
          response.end();
        });
      }
      break;
    case '/commitdraft':
      var user = this._sessions[addr];
      if(!user){
        response.write('{"success":"0","msg":"还没登录，统统锁尔"}','utf-8');
        response.end();
      }
      else{
        var res = {};
        user.updateDraft(data['type'],data['identifier'],data['content']);
        user.commitDraft(data['type'],data['identifier'],data['content']);
        this.DB.checkBackup(function(){
          response.write('{"success":"1"}','utf-8');
          response.end();
        });
      }
      break;
    case '/getallpages':
      var user = this._sessions[addr];
      if(!user){
        response.write('{"success":"0","msg":"还没登录，统统锁尔"}','utf-8');
        response.end();
      }
      else{
        var res = {};
        res.data = user.getAllPages();
        console.log(res.data);
        res.success = 1;
        response.write(JSON.stringify(res),'utf-8');
        response.end();
      }
      break;
    case '/getallredir':
      var user = this._sessions[addr];
      if(!user){
        response.write('{"success":"0","msg":"还没登录，统统锁尔"}','utf-8');
        response.end();
      }
      else{
        var res = {};
        res.data = user.getAllredir();
        //console.log(res.data);
        res.success = 1;
        response.write(JSON.stringify(res),'utf-8');
        response.end();
      }
      break;
    case '/updateredir':
      var user = this._sessions[addr];
      if(!user){
        response.write('{"success":"0","msg":"还没登录，统统锁尔"}','utf-8');
        response.end();
      }
      else{
        user.updateRedir(res['index'],res['key'],res['value']);
        this.DB.checkBackup(function(){
          response.write('{"success":"1"}','utf-8');
          response.end();
        });
      }
      break;
    case '/new':
      var user = this._sessions[addr];
      console.log(data['data']);
      if(!user){
        response.write('{"success":"0","msg":"还没登录，统统锁尔"}','utf-8');
        response.end();
      }
      else if(!data['type']){
        response.write('{"success":"0","msg":"请求错误"}','utf-8');
        response.end();
      }
      else if(data['type'] == 'word' && this.DB.wordExists(data['data'])){
        console.log('exists');
        response.write('{"success":"0","msg":"词条“' + data['data'] + '”已存在，请重新添加。"}','utf-8');
        response.end();
      }
      else if(data['type'] == 'page' && this.DB.pageExists(data['data'])){
        console.log('exists');
        response.write('{"success":"0","msg":"页面“' + data['data'] + '”已存在，请重新添加。"}','utf-8');
        response.end();
      }
      else{
        console.log('not exists');
        user.draft(data['type'],data['data']);
        this.DB.checkBackup(function(){
          response.write('{"success":"1"}','utf-8');
          response.end();
        });
      }
      break;
    case '/delete':
      var user = this._sessions[addr];
      console.log(data['data']);
      if(!user){
        response.write('{"success":"0","msg":"还没登录，统统锁尔"}','utf-8');
        response.end();
      }
      else if(!checkArg(data,['type','identifier'])){
        response.write('{"success":"0","msg":"参数错误"}','utf-8');
        response.end();
      }
      else {
        user.Delete(data['type'],data['identifier']);
        user.closeDraft(data['type'],data['identifier']);
        this.DB.checkBackup(function(){
          response.write('{"success":"1"}','utf-8');
          response.end();
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