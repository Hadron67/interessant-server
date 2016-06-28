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
	a.DraftList = undefined;
	a.Controls = undefined;

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
	a.getControls = function(){
		if(!a.Controls)
			a.Controls = new Controls();
		return a.Controls;
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
			}, 'btn-primary').show();
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
	DraftList.prototype._getRequestRedircb = function(i,cb){
		var parent = this;
		return function(result){
			parent._drafts[i].redirs = result.result;
			if (cb) {
				cb(i, result);
			}
		}
	}
	DraftList.prototype.requestRedirs = function(cb){
		var parent = this;
		for(var i = 0;i < this._drafts.length;i++){
			if(this._drafts[i].type == 'word'){
				$.post('/api/getredir',{
					word : parent._drafts[i].identifier
				},this._getRequestRedircb(i,cb));
			}
		}
	}

	DraftList.prototype.newRedir = function(index,word,cb){
		var parent = this;
		return $.post('/api/newredir',{
			key : word,
			target : parent._drafts[index].identifier
		},function(result){
			if(cb)
				cb(result);
		});
	}
	DraftList.prototype.deleteRedir = function(index,i,cb){
		var parent = this;
		return $.post('/api/deleteredir',{
			key : parent._drafts[index].redirs[i],
			target : parent._drafts[index].identifier
		},function(result){
			if(cb)
				cb(result);
		});
	}
	

	DraftList.prototype.redirTemplet = function(i){
		if(this._drafts[i].type == 'word'){
			var ret =  
				'<div class="row">' +
					'<div class="panel panel-default">' +
						'<div class="panel-heading" role="tab" id="headingOne">' +
							'<h4 class="panel-title">' +
								'<a role="button" data-toggle="collapse" data-parent="#accordion" href="#collapse' + i + '" aria-expanded="true" aria-controls="collapseOne">' +
									'查看重定向' +
								'</a>' +
							'</h4>' +
						'</div>' +
						'<div id="collapse' + i + '" class="panel-collapse collapse" role="tabpanel" aria-labelledby="headingOne">' +
							'<div class="panel-body" id="redir-container' + i + '">' +
								'正在加载...' +
							'</div>' +
						'</div>' +
					'</div>' +
				'</div>';
			return ret;
		}
		else{
			return '';
		}
	}
	DraftList.prototype.renderRedirItem = function(index){
		if(this._drafts[index].type == 'word'){
			var redir = this._drafts[index].redirs;
			var s = '';
			if(redir){
				for(var i = 0;i < redir.length;i++){
					s += 
						'<div class="col-md-3 redir-item-container" data-index="' + index + '">' + 
							redir[i] + 
							'<a hidden="true" data-index="' + i + '" class="remove-redir-item">' +
								'<span class="glyphicon glyphicon-remove" aria-hidden="true"></span>' +
							'</a>' +
						'</div>';
				}
				s +=
					'<div class="col-md-3" data-index="' + index + '">' +
						'<a data-index="' + i + '" class="new-redir-item">' +
							'<span class="glyphicon glyphicon-plus" aria-hidden="true"></span>' +
						'</a>' +
					'</div>';
			}
			else{
				s = '正在加载...';
			}
			$('#redir-container' + index).html(s);
		}
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
							this.redirTemplet(i) +
							'<div class="row">' +
								'<textarea id="file-content' + i + '" rows="25" class="input-group-lg form-control">' + 
									this._drafts[i].content + 
								'</textarea>' +
							'</div>' +
						'</div>';
				}
				$('#file-list').html(list);
				$('#file-content').html(content);
			}
			for(var i = 0;i < this._drafts.length;i++){
				this.renderRedirItem(i);
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
				parent.validateEventsOfRedirs();
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
				parent.validateEventsOfRedirs();
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
	DraftList.prototype.validateEventsOfRedirs = function(){
		var parent = this;
		$('.redir-item-container').mouseover(function(){
			$(this).children().show();
		});
		$('.redir-item-container').mouseout(function(){
			$(this).children().hide();
		});
		$('.new-redir-item').click(function(){
			var index = $('#file-list .active a').attr('data-index');
			new DiagBuilder()
			.title('新重定向词条')
			.content('<input id="newredir" type="text" class="form-control" placeholder="重定向名" />')
			.btn('新建',function(){
				var n = $('#newredir').val();
				parent.newRedir(index,n,function(res){
					if(res.success == 1){
						parent._drafts[index].redirs.push(n);
						parent.renderRedirItem(index);
						parent.validateEventsOfRedirs();
					}
					else{
						a.alert(res.msg,'错误');
					}
				});
			},'btn-primary').show();
		});
		$('.remove-redir-item').click(function(){
			var index = $('#file-list .active a').attr('data-index');
			var i = $(this).attr('data-index');
			new DiagBuilder()
			.title('确认删除')
			.content('确认删除重定向词条“' + parent._drafts[index].redirs[i] + '”？')
			.btn('删除',function(){
				parent.deleteRedir(index,i,function(res){
					if(res.success == 1){
						parent._drafts[index].splice(i,1);
						parent.renderRedirItem(index);
						parent.validateEventsOfRedirs();
					}
					else{
						a.alert(res.msg,'错误');
					}
				});

			},'btn-danger').show();
		});
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
			var b = new DiagBuilder();
			if (parent._drafts[index].type == 'word') {
				t = '词条';
			}
			else if (parent._drafts[index].type == 'page') {
				t = '页面';
			}
			b.content('确认删除' + t + '“' + parent._drafts[index].identifier + '”？注意，此操作不可逆')
			.btn('确认删除', function () {
				parent.deleteDraft(index, function (result) {
					if (result.success != 0) {
						parent._drafts.splice(index, 1);
						parent._currentdraft = 0;
						parent.render();
					}
				});
			}, 'btn-danger').show();
		});
	}

	function Controls(){

	}
	Controls.prototype.exportMainDB = function(cb){
		return $.post('/api/export', {
			what: 'maindb'
		}, function (result) {
			if(cb){
				cb(result);
			}
		});
	}
	Controls.prototype.validateEvents = function(){
		var parent = this;
		$('#btn-export-db').click(function () {
			var $btn = $(this);
			$btn.popover('show');
			$btn.attr('data-content', '正在导出……');
			parent.exportMainDB(function (result) {
				if (result.success != 0) {
					$btn.attr('data-content', '导出完成！');
					$btn.popover('show');
				}
				else {
					$btn.attr('data-content', '导出失败：' + result.msg);
					$btn.popover('show');
				}
			});
		});

		function err(msg) {
			$('.err-container').html(msg);
			$('#diag-err').modal('show');
		}
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
			$('#diag-motal').modal('hide');
			var index = $(this).attr('data-index');
			if (parent._btn[index].cb) {
				parent._btn[index].cb.call(this);
			}
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

	a.alert = function(content,title){
		title = title || '注意';
		new DiagBuilder().title(title).content(content).show();
	}

	return a;
})(jQuery);