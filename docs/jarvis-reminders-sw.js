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
      icon:"./jarvis-pwa-icon.svg",
      badge:"./favicon.ico",
      renotify:false
    }));
  }
});
self.addEventListener("push",function(event){
  var payload={};
  try{payload=event.data?event.data.json():{};}catch(_){try{payload={body:event.data.text()};}catch(__){}}
  var title=payload.title||"JARVIS Reminder";
  var body=payload.body||payload.text||"A reminder is due.";
  var opts={
    body:String(body),
    tag:String(payload.tag||("jarvis-push-"+Date.now())),
    data:{url:payload.url||"./",id:payload.id||null},
    icon:"./jarvis-pwa-icon.svg",
    badge:"./jarvis-pwa-icon.svg",
    renotify:false
  };
  event.waitUntil(self.registration.showNotification(String(title),opts));
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
