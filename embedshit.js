$(function(){

  var v, cb, timeout, $iframe, ready, aspect_width, aspect_height, width, height, firstLoad;

  function init () {
    bind();
    start();
  }

  // Bind user interface changes  
  function bind () {
    // Changing the URL loads it as a new player
    $("#url").on("blur change", function(){
      load( $(this).val() );
    }).focus();

    // Clicking one of the example links loads it
    $("#examples span").on("click", function(){
      var url = $(this).data('video');
      $("#url").val(url);
      load( url );
    });

    // When any of the fields change, reload the player
    $("#fields input:not(.aspect)").change(function(){
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(cb, 500);
    }).each(function(){
      $(this).next("label").attr("for", $(this).attr("name")).append("<br>");
    });

    // When the aspect ratio fields change, resize the player
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

    // Bind the aspect ratio buttons ...
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

    // Editing the aspect ratio..
    // The goal is to get rid of letterboxing by cropping the embed.
    // We tried scraping the width/height from YT and Vimeo, but nothing in JS worked.
    // - Nobody has an oembed that supports JSONP, what's the point
    // - Google's Youtube v2 API doesn't serve height/width, only "aspect: highres" or something
    // - Google's Youtube v3 API only serves it if you have a valid OAUTH token (!)
    // - Vimeo doesn't serve it at all.. You can use their JS API/Froogaloop to get an
    //     embed code with height/width but incredibly this returns the height/width to
    //     which the iframe has been set.  Somehow this number stopped getting initialized
    //     correctly.
    // - Google's Youtube v3 API lets you get an embed code with height/width.. but
    //     their videos always wind up being the same size so why bother..
    $("#other").on("click", function(){
      $(".other_aspect").toggle();
    });
  }

  // Autoload a video (but don't autoplay it)
  function start () {
    firstLoad = true;
    $("#examples span").first().trigger("click");
  }

  // Given a URL, determine if it's a Youtube, Vimeo or Vine and get the ID
  function determineProvider (url) {
    if (/youtube.googleapis.com/.test(url)){
      var pos = url.indexOf('v/') + 2
      return { "provider": "youtube", "id": url.slice(pos, pos+11).toString() };
    }
    else if (/youtube.com\/v\//.test(url)){
      var pos = url.indexOf('v/') + 2
      return { "provider": "youtube", "id": url.slice(pos, pos+11).toString() };
    }
    else if (/youtube.com/.test(url)){
      var pos = url.indexOf('v=') + 2
      return { "provider": "youtube", "id": url.slice(pos, pos+11).toString() };
    }
    else if (/vimeo.com/.test(url)) {
      return { "provider": "vimeo", "id": url.split('/')[3].toString() };
    }  
    else if (/vine.co/.test(url)){
      return { "provider": "vine", "id": url.slice(url.indexOf('v/') + 2).toString().replace(/\/.*/,"") };
    }
    else if (/[-A-Za-z0-9_]+/.test(url)) {
      var id = new String(url.match(/[-A-Za-z0-9_]+/));
      if (id.length == 11) {
        return { "provider": "youtube", "id": id };
      }
      else if (parseInt(id).toString() == id) {
        return { "provider": "vimeo", "id": id };
      }
    }
    throw "Invalid video source";
  };

  // Load a URL into an iframe and display the customization stuff.
  function load (url) {
    if (timeout) clearTimeout(timeout);
    url = url.replace(/^\s/,"").replace(/\s$/,"");
    if (url.length == 0) return;

    var video = determineProvider(url);

    $("#video_provider").html(video.provider);
    $("#video_id").html (video.id);

    $("#embed_code").show();

    $("#fields").show();
    $("#fields input").hide();
    $("#fields label").hide();
    $("#fields span").hide();
    $("." + video.provider).show().each(function(){
      $(this).next("label").show();
    });

    v = video;
    $iframe = newIframe();
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
  }

  // Build an iframe with the parameters we expect.
  // We only make one iframe, and then reset the source and resize it.
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

  // Get the significant digits of a ratio for comparison
  function sigdig(n){ return Math.floor(100 * n) }
  
  // Load the dimensions of the embedded video.
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
  
  // Load the dimensions of the div wrapping the video.
  function setCropDimensions (w,h) {
    width = parseInt( w );
    height = parseInt( h );
    $("[name=width]").val( width );
    $("[name=height]").val( height );
    resize();
  }

  // Given the aspect ratio of the video and the desired size of the rapper div,
  // resize the video to fit, cropping if necessary.  Akin to CSS background-size: cover
  function resize () {
    var w, h, top, left;
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

  // Initialize the Youtube embed apparatus.
  // http://youtube.com/embed/JbY-LoRxdO0
  function init_youtube(){
    $("#aspect").show();
    $("[name=mute]").removeAttr("checked");

    setVideoDimensions( 640, 360 );
    setCropDimensions( 640, 360 );

    load_youtube();
  }
  // Reload the Youtube embed when the parameters change.
  function load_youtube(){
    var params = [];
    var src = "http://youtube.com/embed/" + v.id;
    var w = $("[name=width]").val();
    var h = $("[name=height]").val();
    $(".youtube:checked").each(function(){
      if (firstLoad && this.name === 'autoplay') {
        $("#url").val("");
        firstLoad = false;
        params.push( "autoplay=0" );
        return;
      }
      params.push( this.name + "=" + this.value );
    });
    
    var mins = parseInt( $(".time [name=startMins]").val(), 10);
    var secs = parseInt( $(".time [name=startSecs]").val(), 10);
    if (! isNaN(mins) && ! isNaN(secs) && (mins != 0 || secs != 0)) {
      params.push("start=" + (mins*60 + secs));
    }

    if ($("[name=loop]:checked")) params.push( "playlist=" + v.id );
    if (params.length) src += "?" + params.join("&");

    setCropDimensions( w, h );
    $iframe.attr("src", src);
    $("#embed_code").val( $(".video_rapper").html().replace(/&amp;/g, "&") );
  }

  // Initialize the Vimeo embed apparatus
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

    setVideoDimensions( 640, 360 );
    setCropDimensions( 640, 360 );
    load_vimeo();
  }
  // Reload the Vimeo when any parameters change
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

  // Initialize the Vine embed apparatus.
  // https://vine.co/v/bnrtW52x1uJ/card?mute=1
  function init_vine(){
    $("#aspect").hide();
    $(".other_aspect").hide();
    $("[name=mute]").attr("checked","checked");
    setVideoDimensions( 500, 500 );
    setCropDimensions( 500, 500 );
    load_vine();
  }
  // Reload the Vine when any parameters change.
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
    setCropDimensions( width, height );

    if (params.length) {
      src = src + "?" + params.join("&");
    }

    $iframe.attr("src", src);
    $("#embed_code").val( $(".video_rapper").html() );
  }

	init();
});

