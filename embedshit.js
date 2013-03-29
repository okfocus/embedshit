$(function(){

var v, cb, timeout, $iframe, ready, real_width, real_height, width, height;
$(window).focus(function(){
	$("#url").focus();
});

$("#url").on("blur change", function(){
	load( $(this).val() );
}).focus();

$("#examples span").on("click", function(){
	var url = $(this).data('video');
	$("#url").val(url);
	load( url );
});

$("#fields input").change(function(){
	if (timeout) clearTimeout(timeout);
	timeout = setTimeout(cb, 500);
}).each(function(){
	$(this).next("label").attr("for", $(this).attr("name")).append("<br>");
});

$("#sixteennine").on("click", function(){
	height = width / 16 * 9;
	setVideoDimensions( width, height );
	setCropDimensions( width, height );
});

$("#fourthree").on("click", function(){
	height = width / 4 * 3;
	setVideoDimensions( width, height );
	setCropDimensions( width, height );
});

$("#other").on("click", function(){
	$(".other_aspect").show();
});


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
	$("#video_id").html (video.id);

	$("#embed_code").show();

	$("#fields").show();
	$("#fields input").hide();
	$("#fields label").hide();
	$("." + video.provider).show().each(function(){
		$(this).next("label").show();
	});

	v = video;
	$iframe = newIframe();
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
			load_vine();
      break;
  }
}
function newIframe (){
	var $iframe = $("<iframe>").attr({
	  frameborder: 0
	, scrolling: "no"
	, seamless: "seamless"
	, webkitAllowFullScreen: "webkitAllowFullScreen"
	, mozallowfullscreen: "mozallowfullscreen"
	, allowfullscreen: "allowfullscreen"
	, id: "okplayer"
	});
	$(".video").empty().append($iframe);
	return $iframe;
}
function setVideoDimensions (w,h) {
	real_width = w;
	real_height = h;
	$("[name=real_width]").val( w );
	$("[name=real_height]").val( h );
	$iframe.attr({ width: w, height: h });
}
function setCropDimensions (w,h) {
	width = w;
	height = h;
	$("[name=width]").val( w );
	$("[name=height]").val( h );
}
function resize () {
	$iframe.attr({ width: w, height: h });
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
	$("#aspect").show();
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
	  setVideoDimensions( match[1], match[2] );
		setCropDimensions( match[1], match[2] );
		load_youtube();
	}, "jsonp")
}
function load_youtube(){
	var params = [];
	var src = "http://youtube.com/embed/" + v.id;
	var w = $("[name=width]").val();
	var h = $("[name=height]").val();
	$(".youtube:checked").each(function(){
		params.push( this.name + "=" + this.value );
	});
	if ($("[name=loop]:checked")) params.push( "playlist=" + v.id );
	if (params.length) src += "?" + params.join("&");
	setCropDimensions( w, h );
	$iframe.attr("src", src);
	$("#embed_code").val( $(".video_rapper").html() );
}

// http://player.vimeo.com/video/7100569
function init_vimeo(){
	$("#aspect").show();
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
					setVideoDimensions( match[1], match[2] );
					setCropDimensions( match[1], match[2] );
					load_vimeo();
	  		}, false);
			}
		});
	});
}

function load_vimeo(){
	width = $("[name=width]").val();
	height = $("[name=height]").val();
	setCropDimensions( width, height );

	var src = "http://player.vimeo.com/video/" + v.id + '?api=1&js_api=1&title=0&byline=0&portrait=0&playbar=0&player_id=okplayer';
	$iframe.attr("src", src);
	$("#embed_code").val( $(".video_rapper").html() );
}


// https://vine.co/v/bnrtW52x1uJ/card?mute=1
function init_vine(){
	$("#aspect").hide();
	$(".other_aspect").hide();
	$("[name=mute]").attr("checked","checked");
	setVideoDimensions( 500, 500 );
	setCropDimensions( 500, 500 );
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
	setCropDimensions( 500, 500 );

	if (params.length) {
		src = src + "?" + params.join("&");
	}

	$iframe[0].src = src;
	$("#embed_code").val( $(".video_rapper").html() );
}

});
