


exports.initRoutes = function(server){
    server.addRoute('/api/login',function(request,response){
        var parent = this;
        var msg = '查无此人';
        if (this.DB.userExists(request.params['user'])) {
            msg = '登录密码错误';
        }
        var user = this.DB.getUser(request.params['user'], request.params['pass']);
        var res;
        if (!user) {
            res = {
                success: 0,
                msg: msg
            };
            response.json(res).end();
        }
        else {
            res = {
                success: 1
            };
            request.session['user'] = user;
            response.json(res).end();
            console.log('user "' + request.params['user'] + '" logged in');
        }
    });
}