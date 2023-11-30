chrome.runtime.onInstalled.addListener(function (install){
  switch(install.reason) {
    case "install":
      chrome.storage.sync.get(null, (e)=> {
        if (!(e.internal)) {
          chrome.storage.sync.set({internal:{tokens:{}, active: []}});
          chrome.storage.local.set({external:{}});
          chrome.tabs.create({url:chrome.runtime.getURL("demo/demo.html")});
          return
        }
        const local = {external: {}}
        for (let issuer of e.internal.active) {
          local.external[issuer] = e[issuer];
        }
        chrome.storage.local.set(local);
      });
      return true

    case "update":
      chrome.storage.sync.remove("update_visibility")
      return true
  }
})

chrome.runtime.onMessage.addListener(
     function(message, sender, sendResponse) {
        switch(message.type) {
            case "favicon":
              chrome.tabs.create({url:message.url, active:false}).then(()=> {
                chrome.tabs.query({active: true, currentWindow: true}, ()=> {
                  chrome.tabs.onUpdated.addListener(function test(tabId, changeInfo, tab) {
                    if (tab.url.indexOf(message.url) != -1 && changeInfo.status == 'complete') {
                      chrome.tabs.sendMessage(tab.id, {type:"fav_url"}, function(response) {
                        sendResponse({favicon:response.favi})
                      })
                      chrome.tabs.onUpdated.removeListener(test)
                    }
                  })
                })
              });
              return true
            case "qr":
              chrome.tabs.captureVisibleTab(null, {format:"png"
              }, (tabCapture)=> {
                var queryInfo = {
                    active: true,
                    currentWindow: true
                };
                chrome.tabs.query(queryInfo, function (tabs) {  //https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/extensionTypes/ImageDetails#rect
                    sendResponse({tabC:tabCapture, fav:tabs[0].favIconUrl}); //it may be easier to leave the faviconurl, instead of checking storage for whether the site is known
                });                                                          //may be faster too
              });
              return true

            // case "faviconUrl":
            //   var queryInfo = {
            //       active: true,
            //       currentWindow: true
            //   };
            //   chrome.tabs.query(queryInfo, function (tabs) {
            //       sendResponse({fav:tabs[0].favIconUrl}); //it may be easier to leave the faviconurl, instead of checking storage for whether the site is known
            //   });
            //   return true


            case "addToken":

              let storageReturn = storeData(message.tokenData)
              sendResponse({userGUID: storageReturn.userGUID, exists: storageReturn.exists})
              
              return true

            case "manual":
              // Open Setup/Home Page
              chrome.tabs.create({url:`https://${message.url}`, selected:false}).then(function() {

                chrome.tabs.query({active: true, currentWindow: true}, function(site_tab) {
                  
                  
                  chrome.tabs.onUpdated.addListener(function test(tabId, changeInfo, tab) {

                    // On Load complete
                    if (tab.url.indexOf(message.url) != -1 && changeInfo.status == 'complete') {
                      chrome.tabs.onUpdated.removeListener(test)

                      // Open Favicon Page
                      chrome.tabs.create({url:tab.favIconUrl}).then(function() {
                        chrome.tabs.query({active: true, currentWindow: true}, function() {
                          chrome.tabs.onUpdated.addListener(function test(tabId, changeInfo, tab) {

                            // On Load complete
                            if (changeInfo.status == 'complete') {
                              chrome.tabs.onUpdated.removeListener(test)

                              // Send message to page, to fetch Favicon Data
                              chrome.tabs.sendMessage(tab.id, {type:"fav_url"}, function(response) {

                                chrome.storage.local.get(["external"], (local)=> {
                                  let issuerSettings = {
                                    "settings":
                                      {
                                        "host":`https://${message.url}`,
                                        "setup_page" :`https://${message.url}`,
                                        "favicon": response.favi
                                      }
                                  }
                                  local.external[message.data.issuer] = issuerSettings;
                                  chrome.storage.local.set(local);
                                  // storeData(message.data.user, message.data.key, message.data.issuer, issuerSettings);
                                  // if used - update StoreData ^
                                })
                              })
                            }
                          })
                        })
                      })
                    }
                  })
                })
              })

              // chrome.tabs.create({url: `https://${message.url}`, selected:false}).then(()=> {
              //   chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
              //     chrome.tabs.create({url:tabs[0].favIconUrl})
              //   })
              // })

              return true

            default:
                console.error("Unrecognised message: ", message);
          }
});


function storeData(tokenData) {

  const { user, secret, issuer, settings } = tokenData // lowercase issuer

  chrome.storage.sync.get(null, (sync) => {
    
    let userGUID = crypto.randomUUID()
    let exists = sync.internal.tokens[issuer]

    if (exists) {
      sync.internal.tokens[issuer][userGUID] = 
      {
        "username": user,
        "secret":secret
      };
    }

    else {
      sync.internal.tokens[issuer] = {
        [userGUID]:
            {
              "username": user,
              "secret":secret
            }
      };
    }

    if (!(sync[issuer]) && settings) {
      sync[issuer] = settings;
    }
    chrome.storage.sync.set(sync);
    return {"userGUID": userGUID, "exists": exists};
  })
}


