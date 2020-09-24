
function notify(element) {
	let msg = $(element).clone();
	$(element).parent().prepend(msg);
	msg.show().delay(5000).fadeOut(() => msg.remove())
}

function onLoad() {
	$.ajax('/manage/worlds', {
		type: 'get',
		dataType: 'json',
		success: (data, textStatus, jqXHR) => {
			let worlds = $('#worlds');
			worlds.empty();
			for (var world in data) {
				worlds.append($(`<option value="${world}">${data[world]}</option>`));
			}
			loadUsers();
		},
		error: (jqXHR, textStatus, errorThrown) => {
			console.error([textStatus, errorThrown]);
		}
	});
}

function loadUsers(preselect) {
	let world = $('#worlds').val();
	$.ajax(`/manage/users?w=${world}`, {
		type: 'get',
		dataType: 'json',
		success: (data, textStatus, jqXHR) => {
			let users = $('#users');
			users.empty();
			for (var user in data) {
				users.append($(`<option value="${user}">${data[user]}</option>`));
			}
			if(preselect) {
				users.val(preselect);
			}
			updateNameField();
		},
		error: (jqXHR, textStatus, errorThrown) => {
			console.error([textStatus, errorThrown]);
		}
	});
}

function updateNameField() {
	$('#name').val($("#users option:selected").text());
}

function savePass() {
	let world = $('#worlds').val();
	let user = $('#users').val();
	let curp = $('#curpass').val();
	let newp = $('#newpass').val();
	let conp = $('#conpass').val();
	if (newp !== conp) {
		notify('#pass-no-match');
		return;
	}
	let payload = JSON.stringify({
		world: world,
		user: user,
		curp: curp,
		newp: newp
	});
	$.ajax({
		url: '/manage/update/pass',
		type: 'post',
		dataType: 'json',
		contentType: 'application/json',
		accepts: '',
		data: payload,
		success: (data, textStatus, jqXHR) => {
			notify('#pass-success')
			$('#newpass').val('');
			$('#conpass').val('');
		},
		error: (jqXHR, textStatus, errorThrown) => {
			if (jqXHR.status == 403) {
				notify('#pass-invalid')
			} else if (jqXHR.status == 400) {
				console.error([textStatus, jqXHR.responseText]);
			}
		}
	});
}
function saveUser() {
	let world = $('#worlds').val();
	let user = $('#users').val();
	let curp = $('#curpass').val();
	let name = $('#name').val();
	if (name === $("#users option:selected").text()) {
		notify('#user-same');
		return true;
	}
	let payload = JSON.stringify({
		world: world,
		user: user,
		curp: curp,
		name: name
	});
	$.ajax({
		url: '/manage/update/name',
		type: 'post',
		dataType: 'json',
		contentType: 'application/json',
		accepts: '',
		data: payload,
		success: (data, textStatus, jqXHR) => {
			notify('#user-success');
			loadUsers(user);
		},
		error: (jqXHR, textStatus, errorThrown) => {
			if (jqXHR.status == 403) {
				notify('#pass-invalid');
			}
			else if(jqXHR.status == 409) {
				notify('#user-exists');
			}
			else if (jqXHR.status == 400) {
				console.log({error: jqXHR.status, message: jqXHR.responseText});
			}
		}
	});
}