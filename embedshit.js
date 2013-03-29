$(function(){

var v, cb, timeout, $iframe, ready, aspect_width, aspect_height, width, height;

$("#url").on("blur change", function(){
  load( $(this).val() );
}).focus();

$("#examples span").on("click", function(){
  var url = $(this).data('video');
  $("#url").val(url);
  load( url );
});

$("#fields input:not(.aspect)").change(function(){
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(cb, 500);
}).each(function(){
  $(this).next("label").attr("for", $(this).attr("name")).append("<br>");
});

$("#fields input.aspect").change(function(){
  if (timeout) clearTimeout(timeout);
  var w = $("[name=aspect_width]").val();
  var h = $("[name=aspect_height]").val();
  setVideoDimensions(w, h);
  resize();
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
function sigdig(n){ return Math.floor(100 * n) }
function setVideoDimensions (w,h) {
  var sig_aspect = sigdig(w/h);
  if (sigdig(16/9) == sig_aspect) {
    w = 16; h = 9;
  }
  else if (sigdig(4/3) == sig_aspect) {
    w = 4; h = 3;
  }
  else if (sigdig(1/1) == sig_aspect) {
    w = h = 1;
  }
  aspect_width = parseInt( w );
  aspect_height = parseInt( h );
  $("[name=aspect_width]").val( aspect_width );
  $("[name=aspect_height]").val( aspect_height );
}
function setCropDimensions (w,h) {
  var top, left;
  width = parseInt( w );
  height = parseInt( h );
  $("[name=width]").val( width );
  $("[name=height]").val( height );
  resize();
}
function resize () {
  var w, h;
  $iframe.parent().css({ width: width, height: height, overflow: "hidden", position: "relative" });

  if (width/height >= aspect_width / aspect_height) {
    w = width;
    h = aspect_height / aspect_width * width;
    left = 0;
    top = (height - h) / 2;
  }
  else {
    h = height;
    w = aspect_width / aspect_height * height;
    left = (width - w) / 2;
    top = 0;
  }
  $iframe.css({ position: 'absolute', top: top, left: left, width: w, height: h }).attr({ width: w, height: h });
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

  if ($("[name=loop]:checked").length > 0) src += "&loop=1";
  else src += "&loop=0";
  if ($("[name=autoplay]:checked").length > 0) src += "&autoplay=1";
  else src += "&autoplay=0";

  $iframe.attr("src", src);

  // insertJS('http://a.vimeocdn.com/js/froogaloop2.min.js', function(){
  insertJS('froogaloop.min.js', function(){

    var player = $f($iframe[0]);

    // hide player until Vimeo hides controls...
    window.setTimeout($('#okplayer').css('visibility', 'visible'), 2000);

    player.addEvent("ready", function(){
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

  if ($("[name=loop]:checked").length > 0) src += "&loop=1";
  else src += "&loop=0";
  if ($("[name=autoplay]:checked").length > 0) src += "&autoplay=1";
  else src += "&autoplay=0";
  
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
