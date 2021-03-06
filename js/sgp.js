(function ($) {

  // Configuration / initialization
  var Version = 20130826,
      Domain = 'https://mobile.supergenpass.com',
      MaxArea = 0,
      Dragging = false;

  /*
    Look for jQuery 1.5+ and load it if it can't be found.
    Adapted from Paul Irish's method: http://pastie.org/462639
  */

  var Ready = $ && $.fn && parseFloat($.fn.jquery) >= 1.7 && LoadSGP($);

  if(!Ready) {

    var s = document.createElement('script');
    s.src = '//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js';
    s.onload = s.onreadystatechange = function() {
      var state = this.readyState;
      if(!Ready && (!state || state === 'loaded' || state === 'complete')) {
        Ready = true;
        LoadSGP(jQuery.noConflict());
      }
    };

    /*
      Set timeout to see if it has loaded; otherwise assume that loading
      was blocked by an origin policy or other security setting.
    */

    setTimeout(function() {
      if(!Ready) {
        window.location = Domain;
      }
    }, 2000);

    document.getElementsByTagName('head')[0].appendChild(s);

  }

  function LoadSGP($) {

    var $Target = $(document),

    // Define CSS properties.
    BoxStyle = 'z-index:99999;position:absolute;top:' + $Target.scrollTop() + ';right:5px;width:258px;margin:0;padding:0;box-sizing:content-box;',
    TitleBarStyle = 'overflow:hidden;width:258px;height:20px;margin:0;padding:0;background-color:#356;cursor:move;box-sizing:content-box;',
    FrameStyle = 'position:static;width:258px;height:190px;border:none;overflow:hidden;pointer-events:auto;',

    // Create SGP elements.
    $Box = $("<div/>", {style: BoxStyle}),
    $TitleBar = $("<div/>", {style: TitleBarStyle}),
    $Frame = $("<iframe/>", {src: Domain, scrolling: 'no', style: FrameStyle});

    // Find largest viewport, looping through frames if applicable.
    $('frame,iframe').each(function () {
      try {
        var $ThisFrame = $(this),
            Area = $ThisFrame.height() * $ThisFrame.width();
        if(Area > MaxArea) {
          $Target = $(this.contentWindow.document);
          MaxArea = Area;
        }
      }
      catch(e) {}
    });

    // If no target document is found, redirect to mobile version.
    if(!$Target) {
      window.location = Domain;
    }

    // Enable "close window" link.
    $TitleBar.on('dblclick', function () {
      $Frame.toggle();
    });

    // Append SGP window to target document.
    $Box.append($TitleBar, $Frame).appendTo($('body', $Target));

    // Attach postMessage listener to populate password fields and change
    // iframe height.
    $(window).on('message', function (e) {
      var post = e.originalEvent;
      if(post.origin === Domain && typeof post.data !== 'undefined') {
        $.each($.parseJSON(post.data), function (key, value) {
          switch(key) {
            case 'result':
              $('input:password:visible', $Target)
                .css('background', '#9f9')
                .val(value)
                .trigger('change click')
                .on('input', function () {
                  $(this).css('background', '#fff');
                })
                .focus();
              break;
            case 'height':
              $Frame.animate({
                height: Math.max(parseInt(value, 10), 167) + 2
              });
              break;
          }
        });
      }
    });

    // Post message to SGP generator.
    $Frame.on('load', function () {
      this.contentWindow.postMessage('{"version":'+Version+'}', Domain);
    });

    /*
      Start drag listener.
      Adapted from jQuery console bookmarklet:
      http://github.com/jaz303/jquery-console
    */

    $TitleBar.on({
      mousedown: function (e) {
        var Offset = $Box.offset();
        Dragging = [e.pageX - Offset.left, e.pageY - Offset.top];
        $Frame.css('pointer-events', 'none');
        e.preventDefault();
      },
      mouseup: function () {
        Dragging = false;
        $Frame.css('pointer-events', 'auto');
      }
    });

    $Target.on('mousemove', function (e) {
      if(Dragging) {
        $Box.css({
          left: e.pageX - Dragging[0],
          top: e.pageY - Dragging[1]
        });
      }
    });

    return 1;

  }

})(window.jQuery);
