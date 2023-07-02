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
              chrome.tabs.create({url:message.url, selected:false}).then(function() {
                chrome.tabs.query({active: true, currentWindow: true}, function(kij) {
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
                chrome.tabs.query(queryInfo, function (tabs) {
                    sendResponse({tabC:tabCapture, fav:tabs[0].favIconUrl}); //it may be easier to leave the faviconurl, instead of checking storage for whether the site is known
                });                                                          //may be faster too
              });
              return true

            case "faviconUrl":
              var queryInfo = {
                  active: true,
                  currentWindow: true
              };
              chrome.tabs.query(queryInfo, function (tabs) {
                  sendResponse({fav:tabs[0].favIconUrl}); //it may be easier to leave the faviconurl, instead of checking storage for whether the site is known
              });
              return true

            case "manual":
              chrome.tabs.create({url:`https://${message.url}`, selected:false}).then(function() {
                chrome.tabs.query({active: true, currentWindow: true}, function(site_tab) {
                  chrome.tabs.onUpdated.addListener(function test(tabId, changeInfo, tab) {
                    if (tab.url.indexOf(message.url) != -1 && changeInfo.status == 'complete') {
                      chrome.tabs.onUpdated.removeListener(test)
                      chrome.tabs.create({url:tab.favIconUrl}).then(function() {
                        chrome.tabs.query({active: true, currentWindow: true}, function() {
                          chrome.tabs.onUpdated.addListener(function test(tabId, changeInfo, tab) {
                            if (changeInfo.status == 'complete') {
                              chrome.tabs.onUpdated.removeListener(test)
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
                                  storeData(message.data.user, message.data.key, message.data.issuer, issuerSettings);
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

function storeData(user, secret, issuer, settings) {

  chrome.storage.sync.get(['internal'], (sync) => {
    if (sync.internal.tokens[issuer]) {
      sync.internal.tokens[issuer]["accounts"][user] =
      {
        "secret":secret,
      };
    }
    else {
      sync.internal.tokens[issuer] =
      {
        "accounts":
          {
          [user]:
              {
                "secret":secret
              }
          }
      };
    }

    if (!(sync.internal.active.includes(issuer))) {
      sync.internal.active.push(issuer);
      chrome.storage.sync.set({[issuer]: settings});
    }
    chrome.storage.sync.set(sync);
  })
}
