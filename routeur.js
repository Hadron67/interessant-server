'use strict';

var app = require('./app.js');

exports.initRoutes = function(server){

    server.addRoute('/api/login',app.login);

    server.addRoute('/api/logout',app.logout);

    server.addRoute('/api/getuser',app.getUser);

    server.addRoute('/api/getallwords',app.getAllWords);

    server.addRoute('/api/getdrafts',app.getDrafts);

    server.addRoute('/api/getredir',app.getRedir);

    server.addRoute('/api/edit',app.edit);

    server.addRoute('/api/updatedraft',app.updateDraft);

    server.addRoute('/api/closedraft',app.closeDraft);

    server.addRoute('/api/commitdraft',app.commitDraft);

    server.addRoute('/api/getallpages',app.getAllPages);

    server.addRoute('/api/new',app.doNew);

    server.addRoute('/api/delete',app.doDelete);

    server.addRoute('/api/export',app.doExport);
}