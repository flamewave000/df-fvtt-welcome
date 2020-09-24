var current = Math.floor(Math.random() * 5);
function updateBanner() {
	var title = document.getElementById("title");
	title.style.backgroundImage = "url(/images/banner-" + current + ".jpg)";
	current = (current + 1) % 5;
}

function getWorldName(data) {
	const worldPattern = /id="world-title">\s*<h1>(.+)<\/h1>/i;
	if (data.search('<h1>No Active Game<\/h1>') > 0) return null
	return worldPattern.exec(data)[1];
}

function updateStatus() {
	$.ajax({
		type: 'GET',
		url: `${FVTT_HOST}/join`,
		success: function (data) {
			let worldName = getWorldName(data);
			if (worldName) {
				$('#server-status').addClass('available');
				$('#server-status').html(`<a href="${FVTT_HOST}">"${worldName}" is ready to join</a>`);
			} else {
				$('#server-status').removeClass('available');
				$('#server-status').html(`Server Unavailable`);
			}
		},
		error: function (a,b,c) {
			$('#server-status').removeClass('available');
			$('#server-status').html(`Server Unavailable`);
		}
	});
}

function onLoad() {
	updateBanner();
	updateStatus();
	window.setInterval(updateBanner, 5000);
	window.setInterval(updateStatus, 2500);
}