var totp = new jsOTP.totp();
async function getQR() {
  return new Promise((resolve, reject) => {
    let overlay = document.createElement("div");
    overlay.id = "__otpOverlayDiv";
    document.body.appendChild(overlay);

    async function returnBox(box) {
      return new Promise((resolve, reject) => {

        var selectionDiv = document.createElement("div");
        selectionDiv.id = "__otpSelectionDiv";
        overlay.appendChild(selectionDiv);
        overlay.style.display = "block";

        let startX, startY;

        function mouseM(e) {
          testMin = Math.min(startX, e.clientX)
          testMax = Math.max(startX, e.clientX)

          testYMin = Math.min(startY, e.clientY)
          testYMax = Math.max(startY, e.clientY)

          selectionDiv.style.left = testMin + "px";
          selectionDiv.style.top = testYMin + "px";

          selectionDiv.style.width = testMax - testMin + "px";
          selectionDiv.style.height = testYMax - testYMin + "px";

        }

        function mouseD(e) {
          selectionDiv.style.borderWidth = "2px";
          startX = e.clientX;
          startY = e.clientY;
        }

        function mouseU(e) {
          selectionDiv.style.borderWidth = "0px";
          document.body.removeChild(overlay)

          resolve({
            x: Math.floor(testMin),
            y: Math.floor(testYMin),
            width: Math.floor(testMax - testMin),
            height: Math.floor(testYMax - testYMin)
          });

          overlay.removeEventListener("mousemove",mouseM);
          overlay.removeEventListener("mousedown",mouseD);
          overlay.removeEventListener("mouseup",mouseU);

        }

        overlay.addEventListener("mousedown", mouseD);
        overlay.addEventListener("mousemove", mouseM);
        overlay.addEventListener("mouseup", mouseU);


      });
    }

    returnBox().then((box)=>{

      let full = {box:box, page:{x: window.pageXOffset,y: window.pageYOffset,width:window.innerWidth, heigh:window.innerHeight}}
      resolve(full)
    })
  })
}

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


function getImageDataURL(source, callback){
  let image = new Image();
  image.src = source;
  image.onload = function() {
    var cans = document.createElement('canvas');
    cans.width = image.naturalWidth;
    cans.height = image.naturalHeight;
    cans.getContext('2d').drawImage(image, 0,0);
    callback(cans);
  }
}


chrome.runtime.onMessage.addListener(
     function(message, sender, sendResponse) {
        switch(message.type) {
            case "getQR":
              getQR().then((value)=>{

                chrome.runtime.sendMessage({type:"qr"}, (response)=> {

                  let img = new Image();
                  img.src= response.tabC;

                  img.onload = function () {
                    let t = value.box;
                    let canvas = document.createElement("canvas");
                    canvas.width = t.width;
                    canvas.height = t.height;
                    const ctx = canvas.getContext("2d");
                    var scale = window.devicePixelRatio;
                    ctx.drawImage(img, t.x * scale, t.y * scale, t.width * scale, t.height * scale, 0, 0, t.width, t.height);
                    let url = canvas.toDataURL();

                    let im = new Image()
                    im.src = url

                    function slow(res) {
                      if (!(res.startsWith("otp"))) {
                        alert(res)
                        return
                      }
                      const otpURI = new URL(decodeURIComponent(res));
                      var otpObj = {};

                      for (let [x, y] of otpURI.searchParams) {
                        otpObj[x] = y
                      }
                      otpObj = Object.assign(otpObj, {
                        host: otpURI.pathname.split("/").at(-1).includes(":") ? otpURI.pathname.split("/").at(-1).split(":")[0] : "", //kind of redundant
                        user: otpURI.pathname.split("/").at(-1).includes(":") ? otpURI.pathname.split("/").at(-1).split(":")[1]  : otpURI.pathname.split("/").at(-1)
                      });

                      let te = otpObj?.digits;
                      let issuer = otpObj.issuer ? otpObj.issuer : (otpObj.user.includes("@")) ? otpObj.user.split("@")[1].split(".")[0] : "";
                      issuer = issuer.toLowerCase() //could save this line by appending it to here ------------------------------------^  just need to be sure all issuers are lowercase


                      alert(`Added ${otpObj.user} | Verification Code: ${totp.getOtp(otpObj.secret)}`)
                      chrome.storage.local.get(["external"], (local) => {
                        getImageDataURL(window.location.origin + "/demo/icon_48.png", function(favicon) {
                          const issuerSettings = {
                            "settings":
                              {
                                "host":window.location.hostname.substring(window.location.hostname.lastIndexOf(".", window.location.hostname.lastIndexOf(".") - 1) + 1), //function?
                                "setup_page" : window.location.href,
                                "favicon" : favicon.toDataURL()
                              }
                          }
                          local.external[issuer] = issuerSettings;
                          chrome.storage.local.set(local);
                          storeData(otpObj.user, otpObj.secret, issuer, issuerSettings);

                          })
                      })
                    }

                    const qrcode = new QRCode.Decoder();
                    qrcode
                      .scan(url)
                      .then(result => {
                        slow(result.data);
                      })
                      .catch(error => {

                        alert("Invalid QR code")
                      });
                  };
                })
              });
              return true

            case "updateIcon":
                chrome.storage.local.get(["external"], (local) => {
                  chrome.runtime.sendMessage({type:"faviconUrl"}, (response)=> {
                    getFavicon(response.fav, function(favicon) {
                        const issuerSettings = {
                          "settings":
                            {
                              "host":window.location.hostname.substring(window.location.hostname.lastIndexOf(".", window.location.hostname.lastIndexOf(".") - 1) + 1), //function?
                              "setup_page" : window.location.href,
                              "favicon" : favicon
                            }
                        }
                        local.external[message.issuer] = issuerSettings;
                        chrome.storage.local.set(local)
                        chrome.storage.sync.set({[message.issuer]: issuerSettings});
                      })
                    })
                });
                return true


            default:
                console.error("Unrecognised message: ", message);
        }



});

function correct(node) {node.id = "correct"; node.textContent="Success!";};
function wrong(node) {node.id = "wrong"; node.textContent="Try Again";};

document.querySelector("#demo_button").onclick = function test() {
  let node = document.querySelector("span.verify.bl")
  document.querySelector("#demo_input").value == totp.getOtp("JBSWY3DPEHPK3PXP") ? correct(node) : wrong(node);
}
