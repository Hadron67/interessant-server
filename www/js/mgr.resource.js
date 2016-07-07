var Wikim = (function($,undefined){
	'use strict';
	function _extends(_this, _parent) {
		for (var property in _parent) {
			if (_parent.hasOwnProperty(property))
				_this[property] = _parent[property];
		}
		function __() {
			this.constructor = _this;
		}
		_this.prototype = _parent === null ? Object.create(_parent) : (__.prototype = _parent.prototype, new __());
	}


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
    a.ResControl = undefined;

    a.getResControl = function(){
        if(a.ResControl == undefined){
            a.ResControl = new ResControl();
        }
        return a.ResControl;
    }

    function ImgItem(item){
        this.filename = item.name;
        this.url = item.url;
        this.description = item.desc;
    }
    ImgItem.prototype.getRender = function(){
        var s = 
            '<div class="thumbnail">' +
                '<a href="#">' +
                    '<img  src="' + this.url + '" alt="' + this.url + '" />' +
                '</a>' +
                '<div class="caption">' +
                    '<h3>' + this.filename + '</h3>' +
                    '<p>' + 
                        this.description +
                    '</p>' +
                    '<p>' +
                        '<a href="#" data-fname="' + this.filename +  '" class="btn btn-primary btn-img-options" role="button">选项</a> ' +
                    '</p>' +
                '</div>' +
            '</div>';
        return s;
    }
	function UploadingImg(filename,description){
		this.filename = filename;
		thid.description = description;
		this._id = UploadingImg._index++;
	}
	_extends(UploadingImg,ImgItem);
	UploadingImg._index = 0;
	UploadingImg.prototype.getRender = function(){
		var s = 
            '<div class="thumbnail">' +
                '<div class="progress">' +
					'<div data-fname="' + this.filename +  '" class="progress-upload-img progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100" style="width: 45%">' +
						'<span class="sr-only">45% Complete</span>' +
					'</div>' +
				'</div>' +
                '<div class="caption">' +
                    '<h3>' + this.filename + '</h3>' +
                    '<p>' + 
                        this.description +
                    '</p>' +
                    '<p>' +
                        '<a href="#" data-fname="' + this.filename +  '" class="btn btn-default" role="button">取消上传</a> ' +
                    '</p>' +
                '</div>' +
            '</div>';
        return s;
	}
	UploadingImg.prototype.updateProgress = function(p){
		var $p = $('.progress-upload-img[data-fname="' + this.fname + '"]');
		$p.attr('aria-valuenow',p);
		$p.children.html(p + '% Complete');
	}
	
	

    function ResControl(){
        this._imgs = undefined;

    }
    ResControl.prototype.requestImg = function(cb){
        var parent = this;
        this._imgs = [];
        return $.post('/api/getimages',{},function(result){
            if(result.success == 1){
                var data = result.result;
                for(var i = 0;i < data.length;i++){
                    parent._imgs.push(new ImgItem(data[i]));
                }
            }
            if(cb)
                cb(result);
        });
    }
    ResControl.prototype.render = function(){
        var s = '';
        for(var i = this._imgs.length - 1;i >= 0;i--){
            s += 
                '<div class="col-sm-6 col-md-3">' +
                    this._imgs[i].getRender() +
                '</div>';
        }
        $('#img-container').html(s);
    }
	ResControl.prototype.validateEvents = function(){
		$('#btn-upload-img').click(function(){
			new UploadImgDiag()
			.success(function(result){
				if(result.success == 1){
					a.alert('上传完成');
				}
				else{
					a.alert(result.msg,'错误');
				}
			})
			.show();
			
		});
	}

	function UploadImgDiag(){
		this._cb_before = null;
		this._cb_success = null;
		this._cb_progress = null;
	}
	UploadImgDiag.prototype.show = function(){
		var parent = this;
		new DiagBuilder()
			.title('上传图片')
			.content(
				'<form id="upload-img" method="post" action="/api/uploadimage" enctype="multipart/form-data">' +
					'<div class="form-group">' +
						'<label for="img-filename">图片文件名</label>' +
						'<input name="fname" type="text" class="form-control" id="img-filename" placeholder="文件名">' +
					'</div>' +
					'<div class="form-group">' +
						'<label for="img-description">描述</label>' +
						'<textarea rows="3" name="desc" class="form-control" id="img-description" placeholder="描述"></textarea>' +
					'</div>' +
					'<div class="form-group">' +
						'<label for="img-file">选择图片</label>' +
						'<input type="file" name="file" id="img-file">' +
					'</div>' +
				'</form>'
			)
			.btn('上传',function(){
				$('#upload-img').ajaxSubmit({
					dataType: 'json',
					beforeSubmit: function(){
						if(parent._cb_before){
							return parent._cb_before($('#img-filename').val(),$('#img-description').val());
						}
						else 
							return true;
					},
					success: function(result){
						parent._cb_success && parent._cb_success(result);
					},
					uploadProgress: function (event, position, total, percentComplete) {
						console.log(percentComplete);
						parent._cb_progress && parent._cb_progress(percentComplete);
					}
				});
				return true;
			},'btn-primary').show();
	}
	UploadImgDiag.prototype.before = function(cb){
		this._cb_before = cb;
		return this;
	}
	UploadImgDiag.prototype.success = function(cb){
		this._cb_success = cb;
		return this;
	}
	UploadImgDiag.prototype.progress = function(cb){
		this._cb_progress = cb;
		return this;
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