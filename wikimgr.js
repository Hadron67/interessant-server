'use strict';

var fs = require('fs');

function encryptPass(pass){
	return pass;
}

var WikiDB = function(){
	this._userdb = this._pdb = undefined;
	this.config = {
		pdb: 'db/db.json',
		userdb: 'db/user.json'
	};
	this._pdblock = false;
	this._userdblock = false;

	this._userdbchanged = false;
	this._pdbchanged = false;
}

WikiDB.prototype.open = function(){
	this._pdb = JSON.parse(fs.readFileSync(this.config.pdb,'utf-8'));
	this._userdb = JSON.parse(fs.readFileSync(this.config.userdb,'utf-8'));
}
WikiDB.prototype.checkBackup = function(cb){
	var parent = this;
	if(this._pdbchanged){
		fs.writeFile(this.config.pdb,JSON.stringify(this._pdb),function(e){
			console.log('main database backupped.' + e);
			parent._pdbchanged = false;
			if(parent._userdbchanged){
				fs.writeFile(parent.config.userdb,JSON.stringify(parent._userdb),function(e){
					console.log('user database backupped.');
					if(cb){
						cb(e);
					}
				});
			}
			else if(cb)
				cb(e);
		});
	}
	else if(this._userdbchanged){
		fs.writeFile(this.config.userdb,JSON.stringify(this._userdb),function(e){
			console.log('user database backupped.');
			if(cb){	
				cb(e);
			}
		});
	}
	else if(cb)
		cb();
	
}
WikiDB.prototype.wordExists = function(word){
	for(var i = 0;i < this._pdb.ReDir.length;i++){
		if(this._pdb.ReDir[i].key == word)
			return true;
	}
	return this._pdb.DATAs[word] != undefined;
}
WikiDB.prototype.pageExists = function(page){
	return this._pdb.pages[page] != undefined;
}
WikiDB.prototype.redirExists = function(word){
	for(var i = 0;i < this._pdb.ReDir.length;i++){
		if(this._pdb.ReDir[i].key == word)
			return true;
	}
	return false;
}

WikiDB.prototype.backupUserDB = function(cb){
	fs.writeFile(this.config.userdb,JSON.stringify(this._userdb),function(e){
		console.log('user database backupped.');
		if(cb){
			cb(e);
		}
	});
}

WikiDB.prototype.backupMainDB = function(cb){
	
}
WikiDB.prototype.updateWord = function(word,content){
	//if(this._pdb.DATAs[word] != undefined){
		this._pdb.DATAs[word] = content;
		this._pdbchanged = true;
	//}
}
WikiDB.prototype.updatePage = function(page,content){
	//if(this._pdb.pages[page] != undefined){
		this._pdb.pages[page] = content;
		this._pdbchanged = true;
	//}
}
WikiDB.prototype.deleteWord = function(word,content){
	if(this._pdb.DATAs[word] != undefined){
		delete this._pdb.DATAs[word];
		this._pdbchanged = true;
	}
}
WikiDB.prototype.deletePage = function(page,content){
	if(this._pdb.pages[page] != undefined){
		delete this._pdb.pages[page];
		this._pdbchanged = true;
	}
}
WikiDB.prototype.addWord = function(word,content){
	this._pdb.DATAs[word] = content;
	this._pdbchanged = true;
}
WikiDB.prototype.addPage = function(word,content){
	this._pdb.pages[word] = content;
	this._pdbchanged = true;
}
WikiDB.prototype.userExists = function(name){
	return this._userdb[name] != undefined;
}
WikiDB.prototype.getUser = function(name,pass){
	var dbitem = this._userdb[name];
	if(dbitem && dbitem.pass == encryptPass(pass)){
		var u = new WikiUser(name,dbitem);
		u._db = this;
		return u;
	}
	else
		return undefined;
}
WikiDB.prototype.getWordContentByName = function(name){
	return this._pdb.DATAs[name];
}
WikiDB.prototype.getPageContentByName = function(name){
	return this._pdb.pages[name];
}

var WikiUser = function(name,item){
	this.name = name;
	this._dbitem = item;
	this._db = undefined;
}

WikiUser.prototype.getAllWords = function(){
	var w = [];
	for(var i in this._db._pdb.DATAs){
		w.push(i);
	}
	return w;
}
WikiUser.prototype.draft = function(type,data){
	for(var i = 0;i < this._dbitem.drafts.length;i++){
		if(this._dbitem.drafts[i].type == type && this._dbitem.drafts[i].identifier == data){
			this._dbitem.current_draft = i;
			
			return;
		}
	}
	switch(type){
		case 'word':
			var content = this._db.getWordContentByName(data);
			var s = content || '';
			this._dbitem.drafts.push({
				type : 'word',
				identifier : data,
				content : s
			});
			this._dbitem.current_draft = this._dbitem.drafts.length - 1;
			
			break;
		case 'page':
			var content = this._db.getPageContentByName(data);
			var s = content || '';
			this._dbitem.drafts.push({
				type : 'page',
				identifier : data,
				content : s
			});
			this._dbitem.current_draft = this._dbitem.drafts.length - 1;
			
			break;
	}
}
WikiUser.prototype.getAllDrafts = function(){
	return this._dbitem.drafts;
}
WikiUser.prototype.getCurrentDraft = function(){
	return this._dbitem.current_draft;
}
WikiUser.prototype.updateDraft = function(type,identifier,content){
	for(var i = 0;i < this._dbitem.drafts.length;i++){
		var item = this._dbitem.drafts[i];
		if(item.identifier == identifier && item.type == type){
			item.content = content;
			this._db._userdbchanged = true;
			return 0;
		}
	}
	return -1;
}
WikiUser.prototype.closeDraft = function(type,identifier){
	for(var i = 0;i < this._dbitem.drafts.length;i++){
		var item = this._dbitem.drafts[i];
		if(item.identifier == identifier && item.type == type){
			this._dbitem.current_draft = 0;
			this._dbitem.drafts.splice(i,1); 
			this._db._userdbchanged = true;
			return 0;
		}
	}
}
WikiUser.prototype.getAllPages = function(){
	var w = [];
	for(var i in this._db._pdb.pages){
		w.push(i);
	}
	return w;
}
WikiUser.prototype.commitDraft = function(type,identifier){
	for(var i = 0;i < this._dbitem.drafts.length;i++){
		var item = this._dbitem.drafts[i];
		if(item.identifier == identifier && item.type == type){
			switch(type){
				case 'word':
					this._db.updateWord(identifier,item.content);
					break;
				case 'page':
					this._db.updatePage(identifier,item.content);
					break;
			} 
			return 0;
		}
	}
}
WikiUser.prototype.Delete = function(type,identifier){
	switch(type){
		case 'page':
			this._db.deletePage(identifier);
			break;
		case 'word':
			this._db.deleteWord(identifier);
			break;
	}
}
WikiUser.prototype.getAllredir = function(){
	return this._db._pdb.ReDir;
}
WikiUser.prototype.updateRedir = function(index,key,value){
	if(index < this._db.ReDir.length){
		this._db.ReDir[i].key = key;
		this._db.ReDir[i].value = value;
		this._db._pdbchanged = true;
	}
}

exports.WikiDB = WikiDB;
exports.WikiUser = WikiUser;