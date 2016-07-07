var Wikim = (function($){
	'use strict';
	var user = undefined;
	var a = {};
	a.words = [];
	a.drafts = undefined;
	a.redirs = {};
	a.login = function(username,pass,cb){
		return $.post('/api/login', {
			user: username,
			pass: pass
		}, function (response) {
			user = response.user;
			if(cb)
				cb(response);
		});
	}
	a.getUser = function(cb){
		return $.post('/api/getuser',{},function(response){
			if(response.success != 0){
				$('#user-info').html('以<a aria-haspopup="true" aria-expanded="false" data-toggle="dropdown" id="user-name" href="#" class="user-menu navbar-link">' + response.username + '</a>的身份登录');
				user = response.username;
				$('#user-name').click(function(){
					$('#user-info').dropdown('toggle');
				});
				$('#link-logout').click(function(){
					$.post('/api/logout',{},function(result){
						if(result.success != 0){
							window.location.href = '/login.html';
						}
					});
				});
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

	a.WordList = undefined;
	a.PageList = undefined;

	a.getWordList = function(){
		if(!a.WordList)
			a.WordList = new WordList();
		return a.WordList;
	}
	a.getPageList = function(){
		if(!a.PageList)
			a.PageList = new PageList();
		return a.PageList;
	}


	//--------------------------------word list----------------------------------------------
	function WordList(){
		this.words = [];
		this._status = 0;
		this._err_msg = '';
	}
	WordList.prototype.request = function(cb){
		var parent = this;
		return $.post('/api/getallwords',{},function(response){
			if(response.success != 0){
				var s = '';
				parent.words = response.data;
				parent._status = 0;
			}
			else{
				parent._err_msg = response.msg;
				parent._status = -1;
			}
			if(cb)
				cb(response);
		});
	}
	WordList.prototype.render = function(filter){
		filter = filter || '';
		var s = '';
		if(0 == this._status){
			for(var i = 0;i < this.words.length;i++){
				if(!filter || this.words[i].lastIndexOf(filter) >= 0)
					s += 
						'<div class="col-md-3">' + 
							'<li>' + 
								'<a href="javascript:void(0);" class="words-item">' + 
									this.words[i] + 
								'</a>' + 
							'</li>' + 
						'</div>';
			}
			//$('#words-count').html('一共' + this.words.length + '个词条');
		}
		else{
			s +=
				'<div class="col-md-3">' + 
					this._err_msg + 
				'</div>';
		}
		$('#words-container').html(s);
	}
	WordList.prototype.newWord = function(word,cb){
		return $.post('/api/new', {
			type: 'word',
			data: word
		}, function (result) {
			if(cb)
				cb(result);
		});
	}
	WordList.prototype.editWord = function(word,cb){
		return $.post('/api/edit', {
			type: 'word',
			data: word
		}, function (res) {
			if(cb)
				cb(res);
		});
	}
	WordList.prototype.validateEvents = function(){
		var parent = this;
		function wordslinks(){
			$('.words-item').click(function () {
				var a = $(this);
				parent.editWord(a.html(),function(res){
					if (res.success != 0) {
						window.location.href = '/edit.html';
					}
				});
			});
		}
		wordslinks();

		$('#btn-search-words').click(function () {
			parent.render($('#search-word-form').val());
			wordslinks();
		});

		$('#search-word-form').on('input', function () {
			parent.render($(this).val());
			wordslinks();
		});
		$('#btn-newword').click(function () {
			new DiagBuilder()
			.title('新建词条')
			.content('<input id="newword" type="text" class="form-control" placeholder="词条名" />')
			.btn('新建',function(){
				parent.newWord($('#newword').val(),function(result){
					if (result.success != 0) {
						window.location.href = '/edit.html';
					}
					else {
						a.alert(result.msg,'错误');
					}
				});
				return true;
			},'btn-primary').show();
		});
	}
	//--------------------------------------------------page list---------------------------------------
	function PageList(){
		this._pages = [];
		this._err_msg = '';
		this._status = 0;
	}
	PageList.prototype.request = function (cb) {
		var parent = this;
		return $.post('/api/getallpages', {}, function (response) {
			if (response.success != 0) {
				parent._pages = response.data;
				this._status = 0;
			}
			else{
				this._err_msg = response.msg;
				this._status = -1;
			}
			if (cb) {
				cb(response);
			}
		});
	}
	PageList.prototype.render = function(){
		var s = '';
		if(0 == this._status){
			for (var i = 0; i < this._pages.length; i++) {
				s +=
					'<button type="button" class="list-group-item pages-button" href="#">' + 
						this._pages[i] + 
					'</button>';
			}
		}
		else{
			s += 
				'<div class="col-md-3">' + 
					this._err_msg + 
				'</div>';
		}
		$('#pages-list').html(s);
	}
	PageList.prototype.editPage = function (pname, cb) {
		return $.post('/api/edit', {
			type: 'page',
			data: pname
		}, function (res) {
			if(cb)
				cb(res);
		});
	}
	PageList.prototype.newPage = function(name,cb){
		return $.post('/api/new', {
			type: 'page',
			data: name
		}, function (res) {
			if(cb)
				cb(res);
		});
	}
	PageList.prototype.validateEvents = function(){
		var parent = this;
		$('.pages-button').click(function (e) {
			var a = $(this);
			parent.editPage(a.html(),function(res){
				if (res.success) {
					window.location.href = '/edit.html';
				}
			});
		});
		$('#btn-newpage').click(function () {
			//$('#diag-newpage').modal('show');
			new DiagBuilder()
			.title('新建页面')
			.content('<input id="newpage" type="text" class="form-control" placeholder="页面名称" />')
			.btn('新建',function(){
				parent.newPage($('#newpage').val(), function (res) {
					if (res.success != 0) {
						window.location.href = '/edit.html';
					}
					else {
						Wikim.alert(res.msg, '错误');
					}
				});
				return true;
			}, 'btn-primary').show();
		});
	}
	
	

	function DiagBuilder(){
		this._content = '请确认';
		this._title = '确认信息';
		this._text_pos = undefined;
		this._text_neg = '取消';
		this._class_pos = 'btn-primary';
		this._poscb = undefined;

		this._btn = [];

		this._s = '';
	}
	DiagBuilder._diagqueue = [];
	
	DiagBuilder.prototype.show = function(){
		var parent = this;
		var tbtn = '';
		for(var i = 0;i < this._btn.length;i++){
			tbtn += '<button data-index="' + i + '" type="button" class="diag-btn btn ' + this._btn[i].clazz + '" id="btn-pos' + i + '">' + this._btn[i].text +'</button>'
		}
		var s = 
			'<div class="modal fade" id="diag-motal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">' +
				'<div class="modal-dialog">' +
					'<div class="modal-content">' +
						'<div class="modal-header">' +
							'<button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>' +
							'<h4 class="modal-title" id="myModalLabel">' + this._title + '</h4>' +
						'</div>' +
						'<div class="modal-body" id="delete-confirm-msg">' +
							this._content +
						'</div>' +
						'<div class="modal-footer">' +
							'<button type="button" class="btn btn-default" data-dismiss="modal">' + this._text_neg + '</button>' +
							tbtn + 
						'</div>' +
					'</div>' +
				'</div>' +
			'</div>';
		this._s = s;
		DiagBuilder._diagqueue.push(this);

		if(DiagBuilder._diagqueue.length == 1){
			this._show_hard();
		}
	}
	DiagBuilder.prototype._show_hard = function(){
		var parent = this;
		$('#diag-container').html(this._s);
		$('#diag-motal').on('hidden.bs.modal',function(){
			DiagBuilder._diagqueue.shift();
			var d = DiagBuilder._diagqueue[0];
			if(d){
				d._show_hard();
			}
		});

		$('#diag-motal').modal('show');
		$('.diag-btn').click(function () {
			var index = $(this).attr('data-index');
			if (parent._btn[index].cb) {
				parent._btn[index].cb.call(this) && $('#diag-motal').modal('hide');
			}
			else
				$('#diag-motal').modal('hide');
		});
	}
	DiagBuilder.prototype.title = function(t){
		this._title = t;
		return this;
	}
	DiagBuilder.prototype.content = function(c){
		this._content = c;
		return this;
	}
	DiagBuilder.prototype.negtext = function(t){
		this._text_neg = t;
		return this;
	}

	DiagBuilder.prototype.btn = function(text,cb,clazz){
		this._btn.push({
			text : text,
			cb : cb,
			clazz : clazz || 'btn-default'
		});
		return this;
	}

	a.DiagBuilder = DiagBuilder;

	a.alert = function(content,title){
		title = title || '注意';
		new DiagBuilder().title(title).content(content).show();
	}

	return a;
})(jQuery);