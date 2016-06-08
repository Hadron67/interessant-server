var Wikim = (function($){
	'use strict';
	var user = undefined;
	var a = {};
	a.words = [];
	a.drafts = undefined;
	a.redirs = {};
	a.getUser = function(cb){
		return $.post('/getuser',{},function(response){
			if(response.success != 0){
				$('#user-info').html('以<a aria-haspopup="true" aria-expanded="false" data-toggle="dropdown" id="user-name" href="#" class="user-menu navbar-link">' + response.username + '</a>的身份登录');
				user = response.username;
			}
			else{
				$('#user-info').html('<a href="/login.html" class="navbar-link">未登录</a>');
				//window.location.href = '/login.html';
			}
			if(cb)
				cb(response);
		});
	}
	a.hasLogged = function(){
		return user != undefined;
	}
	
	a.getAllWords = function(cb){
		return $.post('/getallwords',{},function(response){
			if(response.success != 0){
				var s = '';
				a.words = response.data;
				for(var i = 0;i < a.words.length;i++){
					s += '<div class="col-md-3"><li><a href="javascript:void(0);" class="words-item">' + a.words[i] + '</a></li></div>';
				}
				$('#words-container').html(s);
				$('#words-count').html('一共' + a.words.length + '个词条');
				
			}
			else{
				$('#words-container').html('<div class="col-md-3">' + response.msg + '</div>');
			}
			if(cb)
				cb(response);
		});
	}
	a.searchWords = function(keyword,cb){
		if(!a.hasLogged()){
			return;
		}
		var s = '';
		var c = 0;
		for(var i = 0;i < a.words.length;i++){
			if(a.words[i].lastIndexOf(keyword) >= 0){
				c++;
				s += '<div class="col-md-3"><li><a href="javascript:void(0);" class="words-item">' + a.words[i] + '</a></li></div>';
			}
		}
		$('#words-container').html(s);
		$('#words-count').html('一共' + c + '个词条');
	}
	
	a.getAllPages = function(cb){
		return $.post('/getallpages',{},function(response){
			if(response.success != 0){
				var pages = response.data;
				var content = '';
				for(var i = 0;i < pages.length;i++){
					content += '<button type="button" class="list-group-item pages-button" href="#">' + pages[i] + '</button>';
				}
				$('#pages-list').html(content);
			}
			else{
				$('#pages-list').html('<div class="col-md-3">' + response.msg + '</div>');
			}
			if(cb){
				cb(response);
			}
		});
	}
	a.getAllredir = function(cb){
		return $.post('/getallredir',{},function(response){
			if(response.success != 0){
				a.redirs = response.data;
				var list = '<tr><th>被重定向词条</th><th>目标词条</th></tr>';
				for(var i = 0;i < a.redirs.length;i++){
					list += '<tr><td><div id="redirkey' + i + '" class="redir-key container-fluid" data-index="' + i + '">' + a.redirs[i].key + '</div></td><td><div id="redirvalue' + i + '" class="redir-value container-fluid" data-index="' + i + '">' + a.redirs[i].value + '</div></td></tr>';
				}
				$('#table-redir-list').html(list);
			}
			if(cb)
				cb(response);
		});
	}
	
	a.getDrafts = function(cb){
		return $.post('/getdrafts',{},function(result){
			if(result.success != 0){
				a.drafts = result.drafts;
				var list = '';
				var content = '';
				if(result.drafts.length == 0){
					$('#file-list').html('<li role="presentation" class="active"><a href="#aaa" data-toggle="tab">默认标签</a></li>');
					$('#file-content').html(
						'<div class="container-fluid tab-pane fade in active" id="bbb">'
							+'<div class="row">'
								+'<div>没有正在编辑的词条</div>'
							+'</div>'
						+'</div>');
					return;
				}
				for(var i = 0;i < result.drafts.length;i++){
					var active = '';
					var active2 = '';
					if(i == result.current_draft){
						active = 'active';
						active2 = 'in active';
					}
					list += '<li role="presentation" class="' + active + '"><a href="#file' + i + '" data-toggle="tab" data-index="' + i + '">' 
						+ result.drafts[i].identifier + '</a></li>';
					content += '<div class="container-fluid tab-pane fade ' + active2 + '" id="file' + i + '">'
									+ '<div class="row">'
										+ '<textarea id="file-content' + i + '" rows="25" class="input-group-lg">' + result.drafts[i].content + '</textarea>'
									+ '</div>'
							+ '</div>';
				}
				$('#file-list').html(list);
				$('#file-content').html(content);
			}
			if(cb)
				cb(result);
		});
	}
	return a;
})(jQuery);