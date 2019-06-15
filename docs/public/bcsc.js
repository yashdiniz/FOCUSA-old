/*
	This minified script is used to enable bc AND NOTIFICATION functionality to each and every 
	client connection.
	The script has to be included to every page though...
	author:@yash.diniz;
*/
var a,b,c,d,acc;		//GLOBAL BC VARIABLES

var shown=[];	//stores keys of shown notifications
if(!("Notification" in window)){
	if(!localStorage.getItem("notifalert"))alert("This browser does not support notifications. Please update your browser, or make use of a supported browser to have a great experience on FOCUSA.");
	localStorage.setItem("notifalert",true);
}else if(Notification.permission!="granted") {
	Notification.requestPermission((d)=>{
		if(d==="granted"){
			setInterval(notifyMe,3000);	//update notifications every 3 seconds... Notification polling(polling is inefficient, I know...)
		}
	});
} else setInterval(notifyMe,3000);	//update notifications every 3 seconds

// open connection
try { var h=new WebSocket("ws://"+document.location.hostname+"/bcsc"); } catch(SecurityError) { var h=new WebSocket("wss://"+document.location.hostname+"/bcsc"); };
h.onmessage=function(e){evaluate(provide(e.data,parse)[1])};function provide(v,cb){return cb(v)};function parse(c){return JSON.parse(c)};function evaluate(c){eval(c)};

function notifyMe() {
	try {
		$.post("/notifyme", {name:"@username"}, function(notifs){
		if(notifs)for(var key in notifs) {
			if(!shown.includes(key)){	//if post not already shown
				shown.push(key);	//show post, then push as shown... Don't show it again
				var n = new Notification(notifs[key].title, {body:notifs[key].data, icon:"/public/icon.ico", tag:key, lang:"en-US", requireInteraction:true});
				n.onclick = function(event) {
					event.preventDefault();
					$.post("/clearnotif", {id:key});
					window.open(notifs[key].link,"_self");
					n.close();
				}
				n.onclose = function(event) {
					event.preventDefault();
					$.post("/clearnotif", {id:key});
					n.close();
				}
			}
		}
	});
	} catch(Exception) {
	}
}


jQuery(function($) {
	var $bodyEl = $('body'),
	$sidedrawerEl = $('#sidedrawer');

	function showSidedrawer() {
		// show overlay
		var options = {
			onclose: function() {
				$sidedrawerEl
				.removeClass('active')
				.appendTo(document.body);
			}
		};

	var $overlayEl = $(mui.overlay('on', options));

		// show element
		$sidedrawerEl.appendTo($overlayEl);
		setTimeout(function() {
		$sidedrawerEl.addClass('active');
		}, 20);
	}

	var $titleEls = $('strong', $sidedrawerEl);

	$titleEls
	.next()
	.hide();
	$titleEls.on('click', function() {
	$(this).next().slideToggle(200);
	});	

	function hideSidedrawer() {
		$bodyEl.toggleClass('hide-sidedrawer');
	}

	$('.js-show-sidedrawer').on('click', showSidedrawer);
	$('.js-hide-sidedrawer').on('click', hideSidedrawer);
});
