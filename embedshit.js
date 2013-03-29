$(function(){

var v, cb, timeout, $iframe, ready;
$("#fields input").change(function(){
	if (timeout) clearTimeout(timeout);
	timeout = setTimeout(cb, 500);
}).each(function(){
	$(this).next("label").attr("for", $(this).attr("name")).append("<br>");
});
$("#url").on("keyup blur", function(){
	load( $(this).val() );
}).focus();
$("#examples span").on("click", function(){
	load( $(this).data('video') );
});
$(window).focus(function(){
	$("#url").focus();
});


// is it from youtube or vimeo?
var determineProvider = function (url) {

	if (/youtube.googleapis.com/.test(url)){
    return { "provider" : "youtube", "id" : url.slice(url.indexOf('v/') + 2).toString() };
	}
  else if (/youtube.com\/v\//.test(url)){
    return { "provider" : "youtube", "id" : url.slice(url.indexOf('v/') + 2).toString() };
  }
  else if (/youtube.com/.test(url)){
    return { "provider" : "youtube", "id" : url.slice(url.indexOf('v=') + 2).toString() };
  }
  else if (/vimeo.com/.test(url)) {
    return { "provider" : "vimeo", "id" : url.split('/')[3].toString() };
  }  
  else if (/vine.co/.test(url)){
    return { "provider" : "vine", "id" : url.slice(url.indexOf('v/') + 2).toString().replace(/\/.*/,"") };
  }
  else if (/[A-Za-z0-9_]+/.test(url)) {
    var id = new String(url.match(/[A-Za-z0-9_]+/));
    if (id.length == 11) {
      return { "provider" : "youtube", "id" : id };
    }
    else if (parseInt(id).toString() == id) {
      return { "provider" : "vimeo", "id" : id };
    }
  }
  throw "Invalid video source";

};

function load (url) {
	url = url.replace(/^\s/,"").replace(/\s$/,"");
  if (url.length == 0) return;

  var video = determineProvider(url);

	$("#video_provider").html(video.provider);
	$("#video_id").html(video.id);

	$("#fields input").hide();
	$("#fields label").hide();
	$("." + video.provider).show().each(function(){
		$(this).next("label").show();
		$("#embed_code").show();
		$("#examples").hide();
		
	});

	v = video;
	$iframe = new_iframe();
	clearTimeout(timeout);
	ready = false;

  switch (video.provider) {
    case 'youtube':
			init_youtube(v);
			cb = load_youtube;
      break;

    case 'vimeo':
			init_vimeo(v);
			cb = load_vimeo;
      break;

    case 'vine':
			init_vine(v);
			cb = load_vine;
      break;
  }
	cb();
}
function new_iframe (){
	var $iframe = $("<iframe>").attr({
	  frameborder: 0
	, scrolling: "no"
	, seamless: "seamless"
	, webkitAllowFullScreen: "webkitAllowFullScreen"
	, mozallowfullscreen: "mozallowfullscreen"
	, allowfullscreen: "allowfullscreen"
	, id: "okplayer"
	});
	$("#video").empty().append($iframe);
	return $iframe;
}
var loadedJS = {};
function insertJS (src, callback){
	if (loadedJS[src]) return callback();
	loadedJS[src] = true;
  var tag = document.createElement('script');

  if (callback){
    if (tag.readyState){  //IE
      tag.onreadystatechange = function(){
        if (tag.readyState === "loaded" ||
            tag.readyState === "complete"){
          tag.onreadystatechange = null;
          callback();
        }
      };
    } else {
      tag.onload = function() {
        callback();
      };
    }
  }
  tag.src = src;
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
};

// http://youtube.com/embed/JbY-LoRxdO0
function init_youtube(){
	$("[name=mute]").removeAttr("checked");

	var URL = "https://www.googleapis.com/youtube/v3/videos";
	var params = {
	  id: v.id
	, part: 'player'
	, key: 'AIzaSyBrxodlVWBh-v7J3F4wdEGii9rk3IewqZY'
	};
	$.get(URL, params, function(data){
		var html = data.items[0].player.embedHtml;
	  var match = /width=\D(\d+)\D height=\D(\d+)\D/.exec(html);
	  $("[name=width]").val( match[1] );
	  $("[name=height]").val( match[2] );
	  $iframe.width( match[1] );
	  $iframe.height( match[2] );
		load_youtube();
	}, "jsonp")
}

function load_youtube(){
	var params = [];
	var src = "http://youtube.com/embed/" + v.id;
	var width = $("[name=width]").val();
	var height = $("[name=height]").val();
	$(".youtube:checked").each(function(){
		params.push( this.name + "=" + this.value );
	});
	if ($("[name=loop]:checked")) params.push( "playlist=" + v.id );
	if (params.length) src += "?" + params.join("&");
	$iframe.attr({ width: width, height: height });
	$iframe.attr("src", src);
	$("#embed_code").val( $("#video").html() );
}

// http://player.vimeo.com/video/7100569
function init_vimeo(){
	$("[name=mute]").removeAttr("checked");
	var src = "http://player.vimeo.com/video/" + v.id + '?api=1&js_api=1&title=0&byline=0&portrait=0&playbar=0&player_id=okplayer';
	$iframe.attr("src", src);

  // insertJS('http://a.vimeocdn.com/js/froogaloop2.min.js', function(){
	insertJS('froogaloop.min.js', function(){

	  var player = $f($iframe[0]);

	  // hide player until Vimeo hides controls...
  	window.setTimeout($('#okplayer').css('visibility', 'visible'), 2000);

		player.addEvent("ready", function(){
			if ($("[name=autoplay]:checked")) player.api('play');
			if (! ready) {
				ready = true;
	  		player.api('getVideoEmbedCode', function (html, player_id) {
	  			var match = /width="(\d+)" height="(\d+)"/.exec(html);
	  			$("[name=width]").val( match[1] );
	  			$("[name=height]").val( match[2] );
	  			$iframe.width( match[1] );
	  			$iframe.height( match[2] );
	  		}, false);
			}
/*
	    if (OKEvents.utils.isMobile()) {
  	    // mobile devices cannot listen for play event
 	      OKEvents.v.onPlay();
 	    } else {
        player.addEvent('play', OKEvents.v.onPlay());
        player.addEvent('pause', OKEvents.v.onPause());
        player.addEvent('finish', OKEvents.v.onFinish());
      }
*/
		});

	});
}

function load_vimeo(){
	var width = $("[name=width]").val();
	var height = $("[name=height]").val();
	$iframe.attr({ width: width, height: height });

	var src = "http://player.vimeo.com/video/" + v.id + '?api=1&js_api=1&title=0&byline=0&portrait=0&playbar=0&player_id=okplayer';
	$iframe.attr("src", src).css({ width: width, height: height });
	$("#embed_code").val( $("#video").html() );
}

// https://vine.co/v/bnrtW52x1uJ/card?mute=1
function init_vine(){
	$("[name=mute]").attr("checked","checked");
}
function load_vine(){
	var src = "https://vine.co/v/" + v.id + "/card";
	var params = [];

	if ($("[name=mute]:checked").length) params.push( "mute=1" );
	else params.push( "mute=0" );

	var width = $("[name=width]").val();
	var height = $("[name=height]").val();
	if (parseInt(height) > parseInt(width)) {
		height = width;
	}
	$iframe.attr({ width: width, height: height });

	if (params.length) {
		src = src + "?" + params.join("&");
	}

	$iframe[0].src = src;
	$("#embed_code").val( $("#video").html() );
}

});

