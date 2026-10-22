/* JARVIS reminder notification worker. Scheduling remains in the open page; this worker displays and routes notifications. */
"use strict";
self.addEventListener("install",function(event){event.waitUntil(self.skipWaiting());});
self.addEventListener("activate",function(event){event.waitUntil(self.clients.claim());});
self.addEventListener("message",function(event){
  var d=event.data||{};
  if(d.type==="JARVIS_SHOW_NOTIFICATION"&&d.title){
    event.waitUntil(self.registration.showNotification(String(d.title),{
      body:String(d.body||"Reminder due"),
      tag:String(d.tag||"jarvis-reminder"),
      data:{url:d.url||"./",id:d.id||null},
      icon:"./favicon.ico",
      badge:"./favicon.ico",
      renotify:false
    }));
  }
});
self.addEventListener("notificationclick",function(event){
  event.notification.close();
  var target=(event.notification.data&&event.notification.data.url)||"./";
  event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(function(list){
    for(var i=0;i<list.length;i++){
      var client=list[i];
      if("focus"in client){
        return client.focus().then(function(focused){
          if(focused&&"navigate"in focused)return focused.navigate(target);
          return focused;
        });
      }
    }
    if(self.clients.openWindow)return self.clients.openWindow(target);
  }));
});
