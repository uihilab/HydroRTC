$(document).ready(function(){
			var imageData;
			var username
			var socket = io.connect();
			var $chatWrap = $('#chatWrap');
			var $loginWrap = $('#loginWrap');
			var $loginForm = $('#loginForm');
			var $chatForm = $('#chatBox');
			var $msg = $('#message');
			var $username = $('#name');
			var $chatScoll = $('#chatScroll').find('ul');
			var self;
			$loginForm.on('submit',function(e){
				e.preventDefault();
				$newUser = $username.val();
				username = $newUser
				self = $newUser;
				console.log('want to connect as '+$newUser);
				if($newUser != '') {
					$(this).disabled = true;
					socket.emit('new user',$newUser,function(data) {
						if(data) {
							$('#title').html('Welcome, '+$newUser);
							imageData = data
							$username.prop('disabled', true);
							$('#connect').prop('disabled', true);
							$('#resolution').prop('disabled', false);
						} else {
							$('#loginMsg').html('Sorry! A user by that name already exists. Try some other name.');
						}
					});
				} else {
						$('#loginMsg').html('Please enter a valid username to connect.');
						$(this).disabled = false;
				}
			});
			$chatForm.on('submit',function(e){
				e.preventDefault();
				var msg = $('#resolution').val();
				if(msg!='')
					socket.emit('new message',msg, 'resolution');
				//$('#message').val('');
			});
			socket.on('users',function(data){
				var listHtml = '';
				for(i=0;i<data.length;i++){
					listHtml += '<li>'+data[i]+'</li>';
				}
				$('#userList').html(listHtml);
			});
			socket.on('message',function(data){
				if (data.name != username) {
					if (data.type == "resolution") {
						$('#chatScroll>ul').prepend('<li><b>'+data.name+': </b>'+data.msg+'</li>');
						let row = Object.keys(imageData[data.msg])[0]
						socket.emit('new message', imageData[data.msg][row][0], 'image');
					} else {
						console.log(data.msg)
						document.getElementById('recImg').src="data:image/png;base64, "+data.msg
						
					}

				}
			});

});