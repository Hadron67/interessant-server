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
					$.post('/logout',{},function(result){
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
	a.DraftList = undefined;

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
	a.getDraftList = function(){
		if(!a.DraftList)
			a.DraftList = new DraftList();
		return a.DraftList;
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
	WordList.prototype.validateEvents = function(){
		function wordslinks(){
			$('.words-item').click(function () {
				var a = $(this);
				$.post('/api/edit', {
					type: 'word',
					data: a.html()
				}, function (res) {
					if (res.success != 0) {
						window.location.href = '/edit.html';
					}
				});
			});
		}
		wordslinks();

		$('#btn-search-words').click(function () {
			WordList.render($('#search-word-form').val());
			wordslinks();
		});

		$('#search-word-form').on('input', function () {
			WordList.render($(this).val());
			wordslinks();
		});
		$('#btn-newword').click(function () {
			$('#diag-newword').modal('show');
		});
		$('#btn-newword-confirm').click(function () {
			//alert(6456);
			$('#diag-newword').modal('hide');
			$.post('/new', {
				type: 'word',
				data: $('#newword').val()
			}, function (result) {
				if (result.success != 0) {
					window.location.href = '/edit.html';
				}
				else {
					$('.err-container').html(result.msg);
					$('#diag-err').modal('show');
				}
			});
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
	PageList.prototype.validateEvents = function(){
		$('.pages-button').click(function (e) {
			var a = $(this);
			$.post('/edit', {
				type: 'page',
				data: a.html()
			}, function (res) {
				if (res.success) {
					window.location.href = '/edit.html';
				}
			});
		});
		$('#btn-newpage').click(function () {
			$('#diag-newpage').modal('show');
		});
		$('#btn-newpage-confirm').click(function () {
			$('#diag-newpage').modal('hide');
			$.post('/new', {
				type: 'page',
				data: $('#newpage').val()
			}, function (res) {
				if (res.success != 0) {
					window.location.href = '/edit.html';
				}
				else {
					$('.err-container').html(res.msg);
					$('#diag-err').modal('show');
				}
			});
		});
	}
	
	//-------------------------------------------------drafts------------------------------------
	function DraftList(){
		this._drafts = [];
		this._currentdraft = 0;
		this._err_msg = '';
		this._status = 0;
	}
	DraftList.prototype.request = function(cb){
		var parent = this;
		return $.post('/api/getdrafts',{},function(result){
			if(result.success != 0){
				parent._drafts = result.drafts;
				parent._currentdraft = result.current_draft;
				parent._status = 0;
			}
			else{
				parent._status = -1;
				parent._err_msg = result.msg;
			}
			if(cb)
				cb(result);
		});
	}
	DraftList.prototype.render = function(){
		if(this._status == 0){
			if(this._drafts.length == 0){
				$('#file-list').html(
					'<li role="presentation" class="active">' +
						'<a href="#aaa" data-toggle="tab">默认标签</a>' + 
					'</li>'
				);
				$('#file-content').html(
					'<div class="container-fluid tab-pane fade in active" id="bbb">'
						+ '<div class="row">'
							+ '<div>没有正在编辑的词条</div>'
						+ '</div>'
					+ '</div>'
				);
			}
			else {
				var list = '';
				var content = '';
				for (var i = 0; i < this._drafts.length; i++) {
					var active = '';
					var active2 = '';
					if (i == this._currentdraft) {
						active = 'active';
						active2 = 'in active';
					}
					list += 
						'<li role="presentation" class="' + active + '">' + 
							'<a href="#file' + i + '" data-toggle="tab" data-index="' + i + '">' + 
								this._drafts[i].identifier + 
							'</a>' + 
						'</li>';

					content += 
						'<div class="container-fluid tab-pane fade ' + active2 + '" id="file' + i + '">' + 
							'<div class="row" style="padding-bottom:10px;">' +
								'<button type="button" class="btn btn-default btn-close" data-toggle="tooltip" data-placement="top" title="关闭前注意保存">' + 
									'关闭' + 
								'</button>' +
								'<button type="button" class="btn btn-default btn-preview">预览</button>' +
							'</div>' +
							'<div class="row">' +
								'<textarea id="file-content' + i + '" rows="25" class="input-group-lg">' + 
									this._drafts[i].content + 
								'</textarea>' +
							'</div>' +
						'</div>';
				}
				$('#file-list').html(list);
				$('#file-content').html(content);
			}
		}
		this.updateButtonStatus();		
	}
	DraftList.prototype.saveDraft = function(index,cb){
		var parent = this;
		$.post('/api/updatedraft', {
			type: parent._drafts[index].type,
			identifier: parent._drafts[index].identifier,
			content: parent._drafts[index].content
		}, function (result) {
			if(cb)
				cb(result);
		});
	}
	DraftList.prototype.commitDraft = function(index,cb){
		var parent = this;
		$.post('/api/commitdraft', {
			type: parent._drafts[index].type,
			identifier: parent._drafts[index].identifier,
			content: parent._drafts[index].content
		}, function (result) {
			if(cb)
				cb(result);
		});
	}
	DraftList.prototype.closeDraft = function(index,cb){
		var parent = this;
		$.post('/api/closedraft', {
			type: parent._drafts[index].type,
			identifier: parent._drafts[index].identifier
		}, function (result) {
			//console.log(result);
			if (result.success != 0) {
				parent._drafts.splice(index,1);
				parent._currentdraft = 0;
				parent.render();
			}
			if(cb)
				cb(result);
		}).error(function (e) {
			alert(e.toString());
		});
	}
	DraftList.prototype.deleteDraft = function(index,cb){
		var parent = this;
		$.post('/api/delete', {
			type: parent._drafts[index].type,
			identifier: parent._drafts[index].identifier,
		}, function (result) {
			if (result.success != 0) {
				parent._drafts.splice(index,1);
				parent._currentdraft = 0;
				parent.render();
			}
			if(cb)
				cb(result);
		});
	}
	DraftList.prototype.updateButtonStatus = function(){
		if(this._status != 0 || this._drafts.length == 0){
			$('.btn-draftoptr').attr('disabled','disabled');
		}
		else{
			$('.btn-draftoptr').removeAttr('disabled');
			$('.btn-draftoptr').click(function(){});
		}
	}
	DraftList.prototype.validateEvents = function(){
		var parent = this;
		function draftcontrols(){
			$('.btn-close').tooltip();
			$('.btn-close').click(function () {
				var index = $('#file-list .active a').attr('data-index');
				parent.closeDraft(index,function(result){
					draftcontrols();
				});
			});
		}
		draftcontrols();

		$('#btn-save').click(function () {
			var $btn = $(this);
			$btn.attr('data-content', '保存中……');
			$btn.popover('show');
			var index = $('#file-list .active a').attr('data-index');
			parent._drafts[index].content = $('#file-content' + index).val();
			parent.saveDraft(index, function (result) {
				if (result.success != 0) {
					$btn.attr('data-content', '保存成功！');
					$btn.popover('show');
					//alert('success');
				}
				else {
					$btn.attr('data-content', '保存失败：' + result.msg);
					$btn.popover('show');
				}
			});
		});
		
		$('#btn-commit').click(function () {
			var $btn = $(this);
			$btn.attr('data-content', '提交中……');
			$btn.popover('show');
			var index = $('#file-list .active a').attr('data-index');
			var content = $('#file-content' + index).val();
			parent._drafts[index].content = content;

			parent.commitDraft(index,function(result){
				if (result.success != 0) {
					$btn.attr('data-content', '提交成功！');
					$btn.popover('show');
				}
				else {
					$btn.attr('data-content', '提交失败：' + result.msg);
					$btn.popover('show');
				}
			});
		});
		$('#btn-delete').click(function () {
			var index = $('#file-list .active a').attr('data-index');
			var t = '';
			if (Wikim.drafts[index].type == 'word') {
				t = '词条';
			}
			else if (Wikim.drafts[index].type == 'page') {
				t = '页面';
			}
			$('#delete-confirm-msg').html('确认删除' + t + '“' + Wikim.drafts[index].identifier + '”？注意，此操作不可逆');
			$('#diag-delete-confirm').modal('show');
		});
		$('#btn-delete-confirm').click(function () {
			$('#diag-delete-confirm').modal('hide');
			var index = $('#file-list .active a').attr('data-index');
			$.post('/api/delete', {
				type: Wikim.drafts[index].type,
				identifier: Wikim.drafts[index].identifier,
			}, function (result) {
				if (result.success != 0) {
					Wikim.getDrafts(function (result) {
						initEvent();
					});
				}
			});
		});
	}
	
	a.getDrafts = function(cb){
		return $.post('/api/getdrafts',{},function(result){
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
				}
				else{
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
										+ '<div class="row" style="padding-bottom:10px;">'
											+ '<button type="button" class="btn btn-default btn-close" data-toggle="tooltip" data-placement="top" title="关闭前注意保存">关闭</button>'
											+ '<button type="button" class="btn btn-default btn-preview">预览</button>'
										+ '</div>'
										+ '<div class="row">'
											+ '<textarea id="file-content' + i + '" rows="25" class="input-group-lg">' + result.drafts[i].content + '</textarea>'
										+ '</div>'
								+ '</div>';
					}
					$('#file-list').html(list);
					$('#file-content').html(content);
				}
			}
			if(cb)
				cb(result);
		});
	}
	return a;
})(jQuery);