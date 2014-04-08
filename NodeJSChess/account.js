window.fbAsyncInit = function () {
 
    FB.init({
 
        appId:'1407452696183445', // App ID
        channelUrl:'http://udovikov.nixsolutions.com/', // Channel File
        status:true, // check login status
        cookie:true, // enable cookies to allow the server to access the session
        xfbml:true  // parse XFBML
 
    });
 
    FB.Event.subscribe('auth.login', function (response) {
        if (response.status === 'connected') {
 
            FB.api('/me', function (response) {
 
                console.log(response);
                alert(response['birthday']);
                //response масив з даними користувача, які повертає facebook через JSON
 
            });
 
        } else if (response.status === 'not_authorized') {
            alert('not_authorized');
        } else {
            alert('not_authorized');
        }
    });
 
 
};
 
// Load the SDK Asynchronously
(function (d) {
    var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
    if (d.getElementById(id)) {
        return;
    }
    js = d.createElement('script');
    js.id = id;
    js.async = true;
    js.src = "http://connect.facebook.net/en_US/all.js";
    ref.parentNode.insertBefore(js, ref);
}(document));