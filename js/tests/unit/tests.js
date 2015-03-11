$(function () {
	
    module('basic')

      test('login', function () {
		  window.fakeService.sessionInfo({"result":{"authenticated":false}});
		  stop();
		  reload().done(function() {
		  	start();
		      ok($("#mollify-login-name").length, 'username');
		      ok($("#mollify-login-password").length, 'password');
		      
		      $("#mollify-login-name").val("user");
		      $("#mollify-login-password").val("pw");
		      
		      window.fakeService.authenticate({"result":{"authenticated":true,"session_id":"152ed577d28645","user_id":"1","username":"admin","user_type":"a","lang":null,"folders":[{"id":"52affca350207","name":"test","group":"","parent_id":null,"root_id":"52affca350207","path":""}],"roots":[{"id":"52affca350207","name":"test","group":"","parent_id":null,"root_id":"52affca350207","path":""}],"features":{descriptions:true}, "permissions":{}}});
		      equal(window._ajaxRequests.length, 1);
		      
		      window.fakeService.folderInfo("52affca350207", {"result":{"folder":{"id":"52affca350207","root_id":"52affca350207","parent_id":"","name":"test","path":"","is_file":false}, folders:[], "files":[{"id":"52d2b3c748aa8","root_id":"52affca350207","parent_id":"52affca350207","name":"File1.txt","path":"File1.txt","is_file":true,"size":"2969919","extension":"txt"},{"id":"52affca3d39a9","root_id":"52affca350207","parent_id":"52affca350207","name":"File2.pdf","path":"File2.pdf","is_file":true,"size":"46568","extension":"pdf"}],"permissions":{},"data":{},"hierarchy":[{"id":"52affca350207","root_id":"52affca350207","parent_id":"","name":"test","path":"","is_file":false}]}});
		      
		      $("#mollify-login-button").trigger("click");
		      equal(window._ajaxRequests.length, 3);
		      
		      equal(window._ajaxRequests[1].url, "backend/r.php/session/authenticate/");
		      equal(window._ajaxRequests[1].data, "{\"username\":\"user\",\"password\":\"cHc=\",\"remember\":false}");
		      
		      equal(window._ajaxRequests[2].url, "backend/r.php/filesystem/52affca350207/info/?h=1");
			  ok($("#mollify-mainview-main").length, 'mainview');
	      });
      })
})