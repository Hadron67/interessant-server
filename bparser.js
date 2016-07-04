'use strict';

var qs = require('querystring');
var mparty = require('multiparty');



function ParsingResult(){
    this.POST = {};
    this.FILES = {};
    this.status = 0;
    this.err_msg = '';
}

function parseQueryString(req,cb){
    var a = '';
    req.addListener('data', function (pdata) {
        a += pdata;
    }).addListener('end', function (pdata) {
        if (cb)
            cb(qs.parse(a),undefined,undefined);
    });
}

function parseForm(req,cb){
    var form = new mparty.Form();

    form.autoFiles = true;
    form.uploadDir = './tmp';

    form.parse(req,function(err,fields,files){
        // err && console.log(err);
        var post = {};
        var file = {};
        fields && Object.keys(fields).forEach(function (name) {
            post[name] = fields[name][0];
        });

        files && Object.keys(files).forEach(function (name) {
            file[name] = files[name][0];
        });
        if(cb)
            cb(post,file,err);
    });
}

exports.doParse = function(ctype,req,cb){
    switch(ctype){
        case 'application/x-www-form-urlencoded':
            parseQueryString(req,cb);
            break;
        case 'multipart/form-data':
            parseForm(req,cb);
            break;
        default:
            if(cb)
                cb();
    }
}