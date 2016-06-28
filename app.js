'use strict';

function checkArg(data, array) {
    for (var i in array) {
        if (data[array[i]] == undefined)
            return false;
    }
    return true;
}

exports.login = function (request, response) {
    var parent = this;
    var msg = '查无此人';
    if(!checkArg(request.POST,['user','pass'])){
        response.err('invalid arguments').end();
        return;
    }
    if (this.DB.userExists(request.POST['user'])) {
        msg = '登录密码错误';
    }
    var user = this.DB.getUser(request.POST['user'], request.POST['pass']);
    var res;
    if (!user) {
        response.err(msg).end();
    }
    else {
        request.session['user'] = user;
        response.ok().end();
        console.log('user "' + request.POST['user'] + '" logged in');
    }
}
exports.logout = function(request,response){
    if(request.session['user']){
        delete request.session['user'];
        response.ok().end();
    }
    else{
        response.err('根本就没有登录').end();
    }
}

exports.getUser = function (request, response) {
    var user = request.session['user'];
    var res;
    if (user) {
        res = {
            success: 1,
            username: user.name,
        };
    }
    else {
        res = {
            success: 0,
            username: '',
            msg: '还没登录，所以锁尔了'
        };
    }
    response.json(res).end();
}

exports.getAllWords = function (request, response) {
    var user = request.session['user'];
    var res = {};
    if (user) {
        res.success = 1;
        res.data = user.getAllWords();
    }
    else {
        res.success = 0;
        res.msg = '还没登录，所以锁尔了';
    }
    response.json(res).end();
}

exports.edit = function(request, response){
    var user = request.session['user'];
    if(!checkArg(request.POST,['type','data'])){
        response.err('invalid arguments').end();
        return;
    }
    if (!user) {
        response.err("还没登录，统统锁尔").end();
    }
    else {
        user.draft(request.POST['type'], request.POST['data']);
        this.DB.checkBackup(function () {
            response.ok().end();
        });
    }
}

exports.getDrafts = function(request,response){
    var user = request.session['user'];
    if (!user) {
        response.err("还没登录，统统锁尔").end();
    }
    else {
        var res = {};
        res.drafts = user.getAllDrafts();
        res.current_draft = user.getCurrentDraft();
        res.success = 1;
        response.json(res).end();
    }
}

exports.updateDraft = function(request,response){
    var user = request.session['user'];
    if(!checkArg(request.POST,['type','identifier','content'])){
        response.err('invalid arguments').end();
        return;
    }
    if (!user) {
        response.err("还没登录，统统锁尔").end();
    }
    else {
        user.updateDraft(request.POST['type'], request.POST['identifier'], request.POST['content']);
        this.DB.checkBackup(function () {
            response.ok().end();
        });
    }
}

exports.commitDraft = function(request,response){
    var user = request.session['user'];
    if (!checkArg(request.POST, ['type', 'identifier', 'content'])) {
        response.err('invalid arguments').end();
        return;
    }
    if (!user) {
        response.err("还没登录，统统锁尔").end();
    }
    else {
        user.updateDraft(request.POST['type'], request.POST['identifier'], request.POST['content']);
        user.commitDraft(request.POST['type'], request.POST['identifier'], request.POST['content']);
        this.DB.checkBackup(function () {
           response.ok().end();
        });
    }
}

exports.closeDraft = function(request,response){
    var user = request.session['user'];
    if (!checkArg(request.POST, ['type', 'identifier'])) {
        response.err('invalid arguments').end();
        return;
    }

    if (!user) {
        response.err("还没登录，统统锁尔").end();
    }
    else {
        user.closeDraft(request.POST['type'], request.POST['identifier']);
        this.DB.checkBackup(function () {
            response.ok().end();
        });
    }
}

exports.getAllPages = function(request,response){
    var user = request.session['user'];
    if (!user) {
        response.err("还没登录，统统锁尔").end();
    }
    else {
        var res = {};
        res.data = user.getAllPages();
        res.success = 1;
        response.json(res).end();
    }
}

exports.doNew = function(request,response){
    var user = request.session['user'];
    if (!user) {
        response.err("还没登录，统统锁尔").end();
    }
    else if (!checkArg(request.POST,['type','data'])) {
        response.err('请求错误').end();
    }
    else if (request.POST['type'] == 'word' && this.DB.wordExists(request.POST['data'])) {
        response.err('词条“' + request.POST['data'] + '”已存在或被重定向，请重新添加。').end();
    }
    else if (request.POST['type'] == 'page' && this.DB.pageExists(request.POST['data'])) {
        response.err('页面“' + request.POST['data'] + '”已存在，请重新添加。').end();
    }
    else if (request.POST['data'] == '') {
        response.err('锁尔空白的词条名或页面名').end();
    }
    else {
        user.draft(request.POST['type'], request.POST['data']);
        this.DB.checkBackup(function () {
            response.ok().end();
        });
    }
}

exports.doDelete = function(request,response){
    var user = request.session['user'];
    if (!user) {
        response.err("还没登录，统统锁尔").end();
    }
    else if (!checkArg(request.POST, ['type', 'identifier'])) {
        response.err('请求错误').end();
    }
    else {
        user.DeleteItem(request.POST['type'], request.POST['identifier']);
        user.closeDraft(request.POST['type'], request.POST['identifier']);
        this.DB.checkBackup(function () {
            response.ok().end();
        });
    }
}

exports.doExport = function(request,response){
    var user = request.session['user'];
    if (!user) {
        response.err("还没登录，统统锁尔").end();
    }
    else if (!checkArg(request.POST, ['what'])) {
        response.err('请求错误').end();
    }
    else {
        switch (request.POST['what']) {
            case 'maindb':
                user.exportMainDB(function () {
                    response.ok().end();
                });
                break;
        }
    }
}

exports.getRedir = function(request,response){
    if(!checkArg(request.POST,['word'])){
        response.err('invalid arguments').end();
    }
    else{
        var redir = this.DB.getRedir(request.POST['word']);
        response.addjson('result',redir).ok().end();
    }
}