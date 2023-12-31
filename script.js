chrome.storage.sync.get(null, function(sync) {

  if (!(Object.keys(sync.internal.tokens).length == 0)) {
    for (let issuer of Object.keys(sync.internal.tokens)) {
      for (let account of Object.keys(sync.internal.tokens[issuer]["accounts"])) {
        let temp = document.createElement("div");
        temp.className = "OTC_field";
        document.querySelector("div[class='token_box']").appendChild(temp);
        displayToken(sync.internal.tokens[issuer]["accounts"][account]["secret"],account, temp, issuer, sync[issuer]);
      }
    }
  }
  else {
    document.querySelector(".empty_filler").style.display = "Block";
  }
  document.querySelector(".qr_field").addEventListener("click", ()=> {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {type: "getQR"});
      });
//      window.close();
  });
})


var copy = {svg:{fill: "none",height: 15,stroke: "currentcolor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width": 2,width:15, viewBox: "0 0 26 26", class:"copy"},params:{path:{d:"M 5 15 H 4 a 2 2 0 0 1 -2 -2 V 4 a 2 2 0 0 1 2 -2 h 9 a 2 2 0 0 1 2 2 v 1"},rect:{height: 13,rx: 2,ry: 2,width: 13,x: 9,y: 9}}};
var deleteSVG = {svg:{fill:"none",height:15,width:15,stroke:"currentcolor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":2, viewBox:"0 0 26 26", class:"sideIcons delete"},params:{path:{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 6h18M10 11v6M14 11v6"}}}//, polyline:{points:"3 6 5 6 21 6"},line:[{x1:10,x2:10,y1:11,y2:17},{x1:14,x2:14,y1:11,y2:17}]}};

function setAttributes(svgElement, dict) {
  for (const [key, value] of Object.entries(dict)) {
    svgElement.setAttributeNS(null, key, value);
  }
}

function createSVG(svg, parameters, group = false) {
  let xmlns = "http://www.w3.org/2000/svg";

  var svgTag = document.createElementNS(xmlns, "svg");
  setAttributes(svgTag, svg);

  for (let elementEntry of Object.entries(parameters)) {
    if (!(Array.isArray(elementEntry[1]))) {
      element = document.createElementNS(xmlns, elementEntry[0]);
      setAttributes(element, elementEntry[1])
      svgTag.appendChild(element)
    }

    else {
      for (let attrs of elementEntry[1]) {
        element = document.createElementNS(xmlns, elementEntry[0]);
        setAttributes(element, attrs);
        svgTag.appendChild(element)
      }
    }
  }

  if (!(group)) {
    return svgTag
  }

  let gTag = document.createElementNS(xmlns,"g");
  setAttributes(gTag, group);

  while (svgTag.firstChild) {
    gTag.appendChild(svgTag.lastChild);
  }

  svgTag.appendChild(gTag);
  return svgTag
}

function tempColour(string) {
  let hex = (parseInt(string.split("")
     .map(c => c.charCodeAt(0).toString(16).padStart(2, "0"))
     .join("").slice(0,6),16) * 2).toString(16);
  if (hex.match(/.{1,2}/g).map(e => parseInt(e, 16)).reduce((x,y) => x+y,0) > 376) {
    return {bg_color:hex, color:"black"}
  }
  return {bg_color:hex, color:"white"}

}

function displayToken (key, user, parent, issuer, issuerSettings) {
  var totp = new jsOTP.totp();

  tokenName = document.createElement("div");
  tokenName.className = "tokenName";
  let s = document.createElement("span")
  s.innerText = user;
  s.className = "tokenText";
  tokenName.appendChild(s);

  tokenField = document.createElement("div");
  tokenField.className = "otcTokenField";

  token = document.createElement("div");
  token.className = "token";
  token.innerText = totp.getOtp(key);

  let icon;

  try {
    icon = new Image();
    icon.src= (issuerSettings.settings.favicon) ? issuerSettings.settings.favicon : "#";
    icon.className = "favicon";
  }
  catch (e) {
    icon = document.createElement('div');
    icon.textContent = issuer[0].toUpperCase();
    s.innerText = issuer + " | " + user;
    let g = tempColour(issuer);
    icon.style.color = g.color;
    icon.style.backgroundColor = "#" + g.bg_color;
    icon.className = "letter_icon";

    icon.onclick = () => {
      let dialogOverlay = document.createElement("div");
      dialogOverlay.className = "dialog overlay anim-fade-in";
      dialogOverlay.innerHTML = `<div class="dialogBox overlayBox"><span>Are you currently on ${issuer}'s 2FA setup page?</span><div class="delDiv"><button id="diY">Yes</button><button id="diN">No</button></div></div>`;

      dialogOverlay.style.display = "flex";
      document.body.appendChild(dialogOverlay);

      dialogOverlay.querySelector("#diY").onclick = () => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {type: "updateIcon", issuer:issuer});
        });
//        window.close()
      }
      dialogOverlay.querySelector("#diN").onclick = ()=> {
        document.body.removeChild(dialogOverlay);
      }

    }
  }

  const uid = issuer.replace(" ", "")+btoa(user).slice(0,4)+btoa(user).slice(-7,-3);

  let textDiv = document.createElement("div");
  textDiv.className = "otp_content";
  textDiv.id = uid;

  var copyElement = createSVG(copy.svg, copy.params)
  var deleteElement = createSVG(deleteSVG.svg, deleteSVG.params)
  while (parent.lastChild) {
    parent.removeChild(parent.lastChild);
  }
  toolbar = document.createElement("div");
  toolbar.className = "toolbar";


  tokenField.append(token,copyElement);
//  toolbar.append(deleteElement);
  let coo = document.createElement("span")
  coo.className = "countdown"
  toolbar.append(coo)
  textDiv.append(tokenName, tokenField, toolbar);

  container = document.createElement("div");
  container.className = "tokenContainer";

  container.append(icon, textDiv);
  parent.append(container);

  let p_cont = document.getElementById(uid)

  let time = new Date;
  let second = time.getSeconds() // + Math.round(time.getMilliseconds()/100)/10
  let delay = (second >= 30) ? second -30 : second;

  p_cont.querySelector(".countdown").innerHTML = `
    <div class="base-timer">
      <svg class="base-timer__svg" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
        <g class="base-timer__circle">
          <circle class="base-timer__path-elapsed" cx="25" cy="25" r="23" />
          <path
            id="base-timer-path-remaining"
            style="animation-delay: -${delay}s"
            class="base-timer__path-remaining"
            d="
              M 25, 25
              m -23, 0
              a 23,23 0 1,0 46,0
              a 23,23 0 1,0 -46,0
            "
          ></path>
        </g>
      </svg>
      <span class="time base-timer__label">
        <!-- Remaining time label -->
      </span>
    </div>
    `;  





  p_cont.querySelector(".time").innerText = 30 - delay

  let tokenCountdown = setInterval(() => {

    time = new Date;
    let seconds = time.getSeconds() // + Math.round(time.getMilliseconds()/10)/100
    let cdown = (seconds >= 30) ? seconds - 30 : seconds;

    p_cont.querySelector(".time").innerText = 30 - cdown;
    
    if (seconds == 30 || seconds == 0) {
      p_cont.querySelector(".token").innerText = totp.getOtp(key);
//      delay = 0
    }
    
    
    
  }, 1000);

    token.addEventListener("click", ()=> {navigator.clipboard.writeText(p_cont.querySelector(".token").innerText);});

    copyElement.addEventListener("click", ()=>{
        navigator.clipboard.writeText(p_cont.querySelector(".token").innerText);
    });

    var delDiv = document.createElement("div");
    var delY = document.createElement("button");
    var delN = document.createElement("button");
    var delText = document.createElement("span");
    delText.innerHTML = `Delete <span id='del_user'>${user}</span>`
    delText.className = "overlayText";
    delY.style.backgroundColor = "#ff7c7c5c";

    delY.textContent = "Delete";
    delN.textContent = "Cancel";
    delDiv.className = "overlayBox delDiv anim-fade-in";
    let delOverlay = document.createElement("div");
    delOverlay.className = "overlay";

    delDiv.append(delText,delY,delN);
    delOverlay.append(delDiv);

    deleteElement.addEventListener("click", ()=>{
      document.body.appendChild(delOverlay);
      delOverlay.style.display = "flex";

      delY.onclick = function() {
        chrome.storage.sync.get(["internal"], function(output) {
           delete output.internal.tokens[issuer]["accounts"][user]
           debugger
           if (!(Object.keys(output.internal.tokens[issuer]["accounts"]).length)) {
             output.internal.active.splice(output.internal.active.indexOf(issuer), 1);
             chrome.storage.sync.remove(issuer)
           }
           chrome.storage.sync.set(output);
        });
        clearInterval(tokenCountdown);
        parent.parentNode.removeChild(parent)
        document.body.removeChild(delOverlay);
        delOverlay.style.display = "none";
      }
      delN.onclick = function() {
        document.body.removeChild(delOverlay);
        delOverlay.style.display = "none";
      }

    });

    //fix - on mouse hover over long names. Disabled at 1.3 release

    // const ellipsisDeco = {
    //
    //   deco: function() {
    //     this.id = setTimeout(function test() {
    //       p_cont.querySelector(".tokenText").style.position="relative";
    //     }, 700);
    //
    //   }
    // }
    // if (p_cont.querySelector(".tokenName").scrollWidth > p_cont.querySelector(".tokenName").offsetWidth) {
    //   p_cont.querySelector(".tokenName").addEventListener("mouseenter", (e)=> {
    //     clearTimeout(ellipsisDeco.id);
    //     p_cont.querySelector(".tokenText").style.position="absolute";
    //     p_cont.querySelector(".tokenText").style.transform="translateX(-" + (p_cont.querySelector(".tokenName").scrollWidth - p_cont.querySelector(".tokenName").offsetWidth) + "px)";
    //     p_cont.querySelector(".tokenText").style.transition="0.6s";
    //   })
    //   p_cont.querySelector(".tokenName").addEventListener("mouseleave", (e)=> {
    //     p_cont.querySelector(".tokenText").style.transform="translateX(0px)";
    //     p_cont.querySelector(".tokenText").style.transition="0.6s";
    //     ellipsisDeco.deco();
    //   })
    // }
}

function fileHandler(e) {
  e.preventDefault();
  e.stopPropagation();

  if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    [...ev.dataTransfer.items].forEach((item, i) => {
      // If dropped items aren't files, reject them
      if (item.kind === 'file') {
        const file = item.getAsFile();
        console.log(`… file[${i}].name = ${file.name}`);
      }
    });
  } else {
    // Use DataTransfer interface to access the file(s)
    [...ev.dataTransfer.files].forEach((file, i) => {
      console.log(`… file[${i}].name = ${file.name}`);
    });
  }
}

function importW2faBackup(currentSource, importedSource, overwrite) {

  let newData = importedSource
  let oldData = currentSource


  let entirelyNewIssuers = Object.keys(newData.local.external).filter((x) => {return !Object.keys(oldData.local.external).includes(x)})
  debugger


  // -- figure out what to do if local is empty - from chrome profile sync (Not syncing local data)
  // -- case (rare) - does 2fa tokens first, then web2fa backup.


  //takes care of local storage
  for (let newIssuer of entirelyNewIssuers) {
    oldData.local.external[newIssuer] = newData.local.external[newIssuer];

    // oldData.sync[newIssuer] = newData.local.external[newIssuer];  // "cached"/"floating" issuer settings for sync - doesn't work, local will have more that are potentially inactive
  }

  // let active = Array.from(set([...oldData.sync.internal.active, ...newData.sync.internal.active]))
  let newActive = newData.sync.internal.active.filter((x) => {return !oldData.sync.internal.active.includes(x)})
  oldData.sync.internal.active.push(...newActive)
  debugger

  for (let xy of newActive) {
    oldData.sync.internal.tokens[xy] = newData.sync.internal.tokens[xy]
    oldData.sync[xy] = oldData.local.external[xy]
  }
  debugger
  //easy way for now - rewrite each (newdata.active) account in old. re-rewrite if overwrite is off (old secrets go back to what they were)
  if (overwrite) {
    for (let active of newData.sync.internal.active) { //only do active of newdata because non-active (Even new) issuers would be empty e.g. fb.accounts = {}
      debugger
      Object.assign(oldData.sync.internal.tokens[active].accounts, newData.sync.internal.tokens[active].accounts)
      Object.assign(oldData.sync[active], newData.local.external[active])
      // Object.assign(oldData.sync.internal.tokens[active].accounts, oldDataCopy[active].accounts) //should, in theory, only change accounts that were initially there. not newly added accounts
    }
    return
  }
  let oldDataCopy = structuredClone(oldData.sync.internal.tokens) //for overwrite == off
  //overwrite = on
  for (let active of newData.sync.internal.active) {
    debugger //only do active of newdata because non-active (Even new) issuers would be empty e.g. fb.accounts = {}
    Object.assign(oldData.sync.internal.tokens[active].accounts, newData.sync.internal.tokens[active].accounts,  oldDataCopy[active].accounts)
    // Object.assign(oldData.sync.internal.tokens[active].accounts, oldDataCopy[active].accounts) //should, in theory, only change accounts that were initially there. not newly added accounts

  }
}

function fileProcess(e, zone, input) {
  let file_zone = zone;
  let file_input = input;
  const file = file_input.files[0]
  if (file.type != "text/plain") {
    file_input.value = ''
    return
  }
  file_zone.querySelector("span").textContent = (file.name.length > 14) ? file.name.slice(0,14) + ".." + file.name.slice(-3) : file.name
  file_zone.style.padding = "20px 20px";

  document.querySelector(".import_content").style.display = "flex";
  document.querySelector(".import_content").classList.add("import_anim")


  const file_text = file.text()

  document.querySelector(".import_button").addEventListener("click", () => {

    let overwrite = document.getElementById("importOverwrite").checked

    file_text.then((text) => {
      chrome.storage.local.get(null, (localData) => {
        chrome.storage.sync.get(null, (syncData) => {

          let oldData = structuredClone({local:localData, sync:syncData});

          if (text.startsWith("{")) {
            // console.log(JSON.parse(text))
            let importedData = JSON.parse(text)
            // if (importedData.activeIssuers) {
            //
            // } else if (importedData.local && !(importedData.sync)) {
            //   for (let issuer of Object.keys(importedData.local.external))
            // }
            debugger
            if (Object.keys(oldData.sync.internal.tokens).length == 0) {
              console.log("Here")
              chrome.storage.local.set(importedData.local);
              chrome.storage.sync.set(importedData.sync);
              return
            }

            //case tokens not empty, but no tokens set (presently) so if active == []
            if (oldData.sync.internal.active.length == 0) {
              for (let issuer of importedData.sync.internal.active) {
                oldData.local.external[issuer] = importedData.local.external[issuer];
                oldData.sync[issuer] = importedData.sync[issuer]
                oldData.sync.internal.active.push(issuer)
                oldData.sync.internal.tokens[issuer] = importedData.sync.internal.tokens[issuer];
              }
              chrome.storage.local.set(oldData.local);
              chrome.storage.sync.set(oldData.sync);
              return
            }

            chrome.storage.local.get(null, (localData) => {
              chrome.storage.sync.get(null, (syncData) => {
                let oldData = structuredClone({local:localData, sync:syncData});
                importW2faBackup(oldData, importedData, overwrite)
                chrome.storage.local.set(oldData.local)
                chrome.storage.sync.set(oldData.sync)
              })
            })
          }
          else if (text.startsWith("otpauth")) {
            for (let x of text.split("\n")) {
              const otpURI = new URL(decodeURIComponent(x));
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

              if (!(syncData.internal.active.includes(issuer))) {
                syncData.internal.tokens[issuer] = {accounts: {[otpObj.user] :{secret:otpObj.secret}}}
                syncData.internal.active.push(issuer)
                if (localData.external[issuer]) {
                  syncData[issuer] = localData.external[issuer];
                }
                continue;
              }


              if (overwrite)  {
                syncData.internal.tokens[issuer].accounts[otpObj.user] = {secret: otpObj.secret};
              }



            }
            chrome.storage.sync.set(syncData)
          }
          else {
            console.log(text)
            //on changing file, the initial file remains. best option would just be to close the backup (force a re-open perhaps or update the tokens)just for cleanliness
          }
        })
//        window.close()
      })

    })

  })
}

document.querySelector(".quickMenu").onclick = ()=> {

  document.querySelector(".quickMenuOverlay").style.display="flex";

  document.querySelectorAll(".tab_button").forEach((item, index, array) => {
    item.addEventListener("click", (e)=> {
      for (let tab of Array.from(array)) {
        tab.className = tab.className.replace(" activeTab", "");
      }
      for (let div of Array.from(document.querySelectorAll(".tab_content"))) {
        div.style.display="none";
      }
      item.className += " activeTab";
      document.getElementById("qm_" + item.textContent.toLowerCase()).style.display="block";
    })
  });

  //manual
  let issuers;
  let local;
  chrome.storage.local.get("external", (e)=>{
    issuers = (Object.keys(e.external));
    local = e.external;
  })

  function m_progress(issuers) {
    document.querySelector("button.mfield_cont").disabled = false;
    // document.querySelector(".HoverArrow").style.display = "inline-block";
    document.querySelector(".HoverArrow").classList.remove("arrow-inactive")
    document.querySelector(".HoverArrow").classList.add("arrow-active")

    document.querySelector("button.mfield_cont:not(:disabled)").addEventListener("click", function progress(e) {
      document.querySelector("button.mfield_cont:not(:disabled)").removeEventListener("click", progress)

      document.querySelector(".mfirst").classList.add("slide-left")
      document.querySelector(".msecond").classList.add("slide-left")

      document.querySelector(".HoverArrow").classList.remove("arrow-active")
      document.querySelector("button.mfield_cont").innerText = "Add Token"
      document.querySelector("button.mfield_cont").disabled = true;
      document.querySelector("input[name='m_key']").addEventListener("input", (e)=> {
        if (e.target.value != "" && document.querySelector("input[name='m_user']").value != "") {
          document.querySelector("button.mfield_cont").disabled = false;
          document.querySelector("button.mfield_cont:not(:disabled)").onclick = () => {

              let test = {
               issuer:document.querySelector("input[name='m_issuer']").value.toLowerCase(),
               site: document.querySelector("input[name='m_site']").value.toLowerCase(),
               user: document.querySelector("input[name='m_user']").value,
               key: document.querySelector("input[name='m_key']").value
              }
              if (!(issuers.includes(test.issuer))) {
                chrome.runtime.sendMessage({type:"manual", url:test.site, data:test})
                return
              }
              chrome.storage.sync.get(null, (e)=> {
                if (!(e.internal.active.includes(test.issuer))) {
                  e.internal.active.push(test.issuer)
                }
                e[test.issuer] = local[test.issuer]
                e.internal.tokens[test.issuer].accounts[test.user] = {secret: test.key};
                chrome.storage.sync.set(e)
                window.close()
              })
          }
        }
        else {
          document.querySelector("button.mfield_cont").disabled = true;
        }
      })


    })
  }

  let m_wait;
  let filled;
  document.querySelector("input[name='m_issuer']").addEventListener("input", (e)=> {
       clearTimeout(m_wait)
       m_wait = setTimeout(() => {
         if (issuers.includes(e.target.value.toLowerCase())) {
           document.querySelector(".mfield_status").style.textAlign="center";
           // document.querySelector(".mfield_status").className += " anim-fade-in";
           document.querySelector(".mfield_status").style.display = "block";

           document.querySelector(".mfield_status").innerHTML = `<span class="m_info"><span style="color: #0f9719;">Recognized</span> <img width="12" src="${local[e.target.value.toLowerCase()].settings.favicon}"> <span style="font-weight: 600;">${e.target.value}</span> </span>`;
           document.querySelector(".mfield_siteEntry").style.display="none";

          m_progress(issuers);


         }
         else if (e.target.value == "") {
           // document.querySelector(".mfield_status").innerHTML = "";
           document.querySelector(".mfield_status").style.display = "none";

           document.querySelector(".mfield_siteEntry").style.display="none";
           document.querySelector(".mfield_siteEntry input").value = "";
           document.querySelector(".HoverArrow").classList.remove("arrow-active")
           document.querySelector(".HoverArrow").classList.add("arrow-inactive")


           document.querySelector("button.mfield_cont").disabled = true;
           // document.querySelector(".HoverArrow").style.display = "none";
           // document.querySelector(".HoverArrow").classList.toggle("arrow-inactive")


         }
         else {
            // document.querySelector(".mfield_status").innerHTML = `<span style="vertical-align:middle;">Enter issuer site</span>`;
            document.querySelector(".mfield_status").style.display = "none";
            document.querySelector(".mfield_siteEntry").style.display="block";
            // document.querySelector(".mfield_siteEntry").className += " slide_down_anim";
            document.querySelector(".mfield_siteEntry input").placeholder = "E.g. " + e.target.value + ".com";

            document.querySelector("button.mfield_cont").disabled = true;
            document.querySelector(".HoverArrow").classList.remove("arrow-active")
            document.querySelector(".HoverArrow").classList.add("arrow-inactive")
            console.log("test")
            // document.querySelector(".HoverArrow").style.display = "none";
            // document.querySelector(".HoverArrow").classList.toggle("arrow-active")

            let m_wait2;
            document.querySelector("input[name='m_site']").addEventListener("input", (e)=> {
              clearTimeout(m_wait2)
              m_wait2 = setTimeout(() => {
                  if (e.target.value == "") {
                  document.querySelector("button.mfield_cont").disabled = true;
                  // document.querySelector(".HoverArrow").style.display = "none";
                  document.querySelector(".HoverArrow").classList.remove("arrow-active")
                  document.querySelector(".HoverArrow").classList.add("arrow-inactive")


                }
                else {
                  m_progress(issuers)

                }
              }, 1000)
            })
          }

        clearTimeout(m_wait);
      }, 1000)
  })
  //recognized Microsoft


  //import
  let file_input = document.getElementById("file_input");
  let file_zone = document.querySelector(".file_zone");
  file_zone.addEventListener("click", (e)=> {
    if (file_input) {
      file_input.click()
    }
  })

  file_zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    // console.log(e)
  })

  file_zone.addEventListener("drop", (ev)=> {
    ev.stopPropagation()
    ev.preventDefault();
    fileProcess(ev, file_zone, ev.dataTransfer);

    // if (ev.dataTransfer.items) {
    //   // Use DataTransferItemList interface to access the file(s)
    //   [...ev.dataTransfer.items].forEach((item, i) => {
    //     // If dropped items aren't files, reject them
    //     if (item.kind === 'file') {
    //       const file = item.getAsFile();
    //       console.log(`… file[${i}].name = ${file.name}`);
    //     }
    //   });
    // } else {
    //   // Use DataTransfer interface to access the file(s)
      // [...ev.dataTransfer.files].forEach((file, i) => {
      //   console.log(`… file[${i}].name = ${file.name}`);
      // });
    // }

    // file_zone.textContent =
  })



  file_input.addEventListener("change", (e) => fileProcess(e, file_zone, file_input))

  //backup
  // document.querySelectorAll('.download_options option').forEach((item, index, array) => {
  //   item.addEventListener("select", (e)=> {
  //     // for (let tab of Array.from(array)) {
  //     //   tab.className = tab.className.replace(" bActive", "");
  //     // }
  //     for (let p of Array.from(document.querySelectorAll(".bInfo"))) {
  //       p.style.display="none";
  //     }
  //     // item.className += " bActive";
  //     console.log(item)
  //     document.getElementById(item.value + "Info").style.display="block";
  //   })
  // });

  // document.querySelector(".downloadSelect").addEventListener("change", (e)=> {
  //   for (let p of Array.from(document.querySelectorAll(".bInfo"))) {
  //     p.style.display="none";
  //   }
  //   console.log(e.target.value)
  //   document.getElementById(e.target.value + "Info").style.display="block"
  // })

  document.querySelector(".downloadButton").onclick = () => {
    chrome.storage.sync.get(null, (syncData)=> {
      switch (document.querySelector('input[name="backup"]:checked').value) {
        case "sync":
          let tokens = syncData.internal
          delete syncData.internal
          downloadBackup(JSON.stringify({activeIssuers: syncData, sync:tokens}, null, "\t"))
          break
        case "url":
          let a = [];
          for (let iss of Object.keys(syncData.internal.tokens)) {
            for (let acc of Object.keys(syncData.internal.tokens[iss].accounts)) {
              a.push(`otpauth://totp/${iss}:${acc}?secret=${syncData.internal.tokens[iss].accounts[acc].secret}&issuer=${iss}`)
            }
          }
          downloadBackup(a.join("\n"))
          break
        case "all":
          //check if local/sync is being used
          chrome.storage.local.get(null, (localData)=> {
            downloadBackup(JSON.stringify({local:localData, sync:syncData}, null, "\t"))
          })
          break
        default:
          console.log("Error downloading Backups")
      }
    })
    document.querySelector(".quickMenuOverlay").style.display = "none";
  }
  document.querySelector(".closeOverlay").onclick =()=> {document.querySelector(".quickMenuOverlay").style.display = "none";}

}

const downloadBackup = (object) => {
  const file = new File([object], 'web2FA Backup.txt', {
    type: 'text/plain',
  })

  const url = URL.createObjectURL(file)
  const link = document.createElement("a");
  link.download = file.name;
  link.href = url;

  const evt = new MouseEvent("click", {
      view: window,
      bubbles: true,
      cancelable: true,
  });

  link.dispatchEvent(evt);
  window.URL.revokeObjectURL(url)
}

// jsOTP - https://github.com/jiangts/JS-OTP

/*
 * File combining
 * (1) sha.js by Brian Turek 2008-2013 under BSD license
 * (2) and a modified js OTP implementation found on JSFiddle
 */

(function() {
  var r, e;
  e = class {
    constructor(r = 30, e = 6) {
      if (this.expiry = r, this.length = e, this.length > 8 || this.length < 6) throw "Error: invalid code length"
    }
    dec2hex(r) {
      return (r < 15.5 ? "0" : "") + Math.round(r).toString(16)
    }
    hex2dec(r) {
      return parseInt(r, 16)
    }
    base32tohex(r) {
      var e, n, t, o, h;
      for ("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", e = "", t = "", o = 0; o < r.length;) h = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(r.charAt(o).toUpperCase()), e += this.leftpad(h.toString(2), 5, "0"), o++;
      for (o = 0; o + 4 <= e.length;) n = e.substr(o, 4), t += parseInt(n, 2).toString(16), o += 4;
      return t
    }
    leftpad(r, e, n) {
      return e + 1 >= r.length && (r = Array(e + 1 - r.length).join(n) + r), r
    }
    getOtp(r, e = (new Date).getTime()) {
      var n, t, o, h, i, w, d;
      if (o = this.base32tohex(r), n = Math.round(e / 1e3), d = this.leftpad(this.dec2hex(Math.floor(n / this.expiry)), 16, "0"), (w = new jsSHA("SHA-1", "HEX")).setHMACKey(o, "HEX"), w.update(d), "KEY MUST BE IN BYTE INCREMENTS" === (t = w.getHMAC("HEX"))) throw "Error: hex key must be in byte increments";
      return h = this.hex2dec(t.substring(t.length - 1)), i = (i = (this.hex2dec(t.substr(2 * h, 8)) & this.hex2dec("7fffffff")) + "").length > this.length ? i.substr(i.length - this.length, this.length) : this.leftpad(i, this.length, "0")
    }
  }, r = class {
    constructor(r = 6) {
      if (this.length = r, this.length > 8 || this.length < 6) throw "Error: invalid code length"
    }
    uintToString(r) {
      var e;
      return e = String.fromCharCode.apply(null, r), decodeURIComponent(escape(e))
    }
    getOtp(r, e) {
      var n, t, o, h, i;
      return (h = new jsSHA("SHA-1", "TEXT")).setHMACKey(r, "TEXT"), h.update(this.uintToString(new Uint8Array(this.intToBytes(e)))), n = h.getHMAC("HEX"), i = (127 & (t = this.hexToBytes(n))[o = 15 & t[19]]) << 24 | (255 & t[o + 1]) << 16 | (255 & t[o + 2]) << 8 | 255 & t[o + 3], (i += "").substr(i.length - this.length, this.length)
    }
    intToBytes(r) {
      var e, n;
      for (e = [], n = 7; n >= 0;) e[n] = 255 & r, r >>= 8, --n;
      return e
    }
    hexToBytes(r) {
      var e, n, t;
      for (n = [], t = 0, e = r.length; t < e;) n.push(parseInt(r.substr(t, 2), 16)), t += 2;
      return n
    }
  }, window.jsOTP = {}, jsOTP.totp = e, jsOTP.hotp = r
}).call(this);
var SUPPORTED_ALGS = 7;
! function(r) {
  "use strict";

  function e(r, e) {
    this.highOrder = r, this.lowOrder = e
  }

  function n(r, e, n) {
    var t, o, h, i, w, d, u = r.length;
    if (t = e || [0], d = (n = n || 0) >>> 3, 0 != u % 2) throw new Error("String of HEX type must be in byte increments");
    for (o = 0; o < u; o += 2) {
      if (h = parseInt(r.substr(o, 2), 16), isNaN(h)) throw new Error("String of HEX type contains invalid characters");
      for (i = (w = (o >>> 1) + d) >>> 2; t.length <= i;) t.push(0);
      t[i] |= h << 8 * (3 - w % 4)
    }
    return {
      value: t,
      binLen: 4 * u + n
    }
  }

  function t(r, e, n) {
    var t, o, h, i, w, d = [];
    for (d = e || [0], h = (n = n || 0) >>> 3, o = 0; o < r.length; o += 1) t = r.charCodeAt(o), i = (w = o + h) >>> 2, d.length <= i && d.push(0), d[i] |= t << 8 * (3 - w % 4);
    return {
      value: d,
      binLen: 8 * r.length + n
    }
  }

  function o(r, e, n) {
    var t, o, h, i, w, d, u, a, l = [],
      s = 0;
    if (l = e || [0], d = (n = n || 0) >>> 3, -1 === r.search(/^[a-zA-Z0-9=+\/]+$/)) throw new Error("Invalid character in base-64 string");
    if (w = r.indexOf("="), r = r.replace(/\=/g, ""), -1 !== w && w < r.length) throw new Error("Invalid '=' found in base-64 string");
    for (t = 0; t < r.length; t += 4) {
      for (i = r.substr(t, 4), h = 0, o = 0; o < i.length; o += 1) h |= "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(i[o]) << 18 - 6 * o;
      for (o = 0; o < i.length - 1; o += 1) {
        for (u = (a = s + d) >>> 2; l.length <= u;) l.push(0);
        l[u] |= (h >>> 16 - 8 * o & 255) << 8 * (3 - a % 4), s += 1
      }
    }
    return {
      value: l,
      binLen: 8 * s + n
    }
  }

  function h(r, e) {
    var n, t, o = "",
      h = 4 * r.length;
    for (n = 0; n < h; n += 1) t = r[n >>> 2] >>> 8 * (3 - n % 4), o += "0123456789abcdef".charAt(t >>> 4 & 15) + "0123456789abcdef".charAt(15 & t);
    return e.outputUpper ? o.toUpperCase() : o
  }

  function i(r, e) {
    var n, t, o, h, i, w, d = "",
      u = 4 * r.length;
    for (n = 0; n < u; n += 3)
      for (h = n + 1 >>> 2, i = r.length <= h ? 0 : r[h], h = n + 2 >>> 2, w = r.length <= h ? 0 : r[h], o = (r[n >>> 2] >>> 8 * (3 - n % 4) & 255) << 16 | (i >>> 8 * (3 - (n + 1) % 4) & 255) << 8 | w >>> 8 * (3 - (n + 2) % 4) & 255, t = 0; t < 4; t += 1) 8 * n + 6 * t <= 32 * r.length ? d += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(o >>> 6 * (3 - t) & 63) : d += e.b64Pad;
    return d
  }

  function w(r) {
    var e, n, t = "",
      o = 4 * r.length;
    for (e = 0; e < o; e += 1) n = r[e >>> 2] >>> 8 * (3 - e % 4) & 255, t += String.fromCharCode(n);
    return t
  }

  function d(r) {
    var e, n = {
      outputUpper: !1,
      b64Pad: "="
    };
    if (e = r || {}, n.outputUpper = e.outputUpper || !1, n.b64Pad = e.b64Pad || "=", "boolean" != typeof n.outputUpper) throw new Error("Invalid outputUpper formatting option");
    if ("string" != typeof n.b64Pad) throw new Error("Invalid b64Pad formatting option");
    return n
  }

  function u(r, e) {
    var h;
    switch (e) {
      case "UTF8":
      case "UTF16BE":
      case "UTF16LE":
        break;
      default:
        throw new Error("encoding must be UTF8, UTF16BE, or UTF16LE")
    }
    switch (r) {
      case "HEX":
        h = n;
        break;
      case "TEXT":
        h = function(r, n, t) {
          return function(r, e, n, t) {
            var o, h, i, w, d, u, a = [],
              l = [],
              s = 0;
            if (a = n || [0], w = (t = t || 0) >>> 3, "UTF8" === e)
              for (h = 0; h < r.length; h += 1)
                for (l = [], 128 > (o = r.charCodeAt(h)) ? l.push(o) : 2048 > o ? (l.push(192 | o >>> 6), l.push(128 | 63 & o)) : 55296 > o || 57344 <= o ? l.push(224 | o >>> 12, 128 | o >>> 6 & 63, 128 | 63 & o) : (h += 1, o = 65536 + ((1023 & o) << 10 | 1023 & r.charCodeAt(h)), l.push(240 | o >>> 18, 128 | o >>> 12 & 63, 128 | o >>> 6 & 63, 128 | 63 & o)), i = 0; i < l.length; i += 1) {
                  for (d = (u = s + w) >>> 2; a.length <= d;) a.push(0);
                  a[d] |= l[i] << 8 * (3 - u % 4), s += 1
                } else if ("UTF16BE" === e || "UTF16LE" === e)
                  for (h = 0; h < r.length; h += 1) {
                    for (o = r.charCodeAt(h), "UTF16LE" === e && (o = (i = 255 & o) << 8 | o >>> 8), d = (u = s + w) >>> 2; a.length <= d;) a.push(0);
                    a[d] |= o << 8 * (2 - u % 4), s += 2
                  }
            return {
              value: a,
              binLen: 8 * s + t
            }
          }(r, e, n, t)
        };
        break;
      case "B64":
        h = o;
        break;
      case "BYTES":
        h = t;
        break;
      default:
        throw new Error("format must be HEX, TEXT, B64, or BYTES")
    }
    return h
  }

  function a(r, e) {
    return r << e | r >>> 32 - e
  }

  function l(r, e) {
    return r >>> e | r << 32 - e
  }

  function s(r, n) {
    var t = new e(r.highOrder, r.lowOrder);
    return 32 >= n ? new e(t.highOrder >>> n | t.lowOrder << 32 - n & 4294967295, t.lowOrder >>> n | t.highOrder << 32 - n & 4294967295) : new e(t.lowOrder >>> n - 32 | t.highOrder << 64 - n & 4294967295, t.highOrder >>> n - 32 | t.lowOrder << 64 - n & 4294967295)
  }

  function f(r, e) {
    return r >>> e
  }

  function O(r, n) {
    return 32 >= n ? new e(r.highOrder >>> n, r.lowOrder >>> n | r.highOrder << 32 - n & 4294967295) : new e(0, r.highOrder >>> n - 32)
  }

  function g(r, e, n) {
    return r ^ e ^ n
  }

  function c(r, e, n) {
    return r & e ^ ~r & n
  }

  function S(r, n, t) {
    return new e(r.highOrder & n.highOrder ^ ~r.highOrder & t.highOrder, r.lowOrder & n.lowOrder ^ ~r.lowOrder & t.lowOrder)
  }

  function p(r, e, n) {
    return r & e ^ r & n ^ e & n
  }

  function E(r, n, t) {
    return new e(r.highOrder & n.highOrder ^ r.highOrder & t.highOrder ^ n.highOrder & t.highOrder, r.lowOrder & n.lowOrder ^ r.lowOrder & t.lowOrder ^ n.lowOrder & t.lowOrder)
  }

  function A(r) {
    return l(r, 2) ^ l(r, 13) ^ l(r, 22)
  }

  function H(r) {
    var n = s(r, 28),
      t = s(r, 34),
      o = s(r, 39);
    return new e(n.highOrder ^ t.highOrder ^ o.highOrder, n.lowOrder ^ t.lowOrder ^ o.lowOrder)
  }

  function T(r) {
    return l(r, 6) ^ l(r, 11) ^ l(r, 25)
  }

  function v(r) {
    var n = s(r, 14),
      t = s(r, 18),
      o = s(r, 41);
    return new e(n.highOrder ^ t.highOrder ^ o.highOrder, n.lowOrder ^ t.lowOrder ^ o.lowOrder)
  }

  function b(r) {
    return l(r, 7) ^ l(r, 18) ^ f(r, 3)
  }

  function P(r) {
    var n = s(r, 1),
      t = s(r, 8),
      o = O(r, 7);
    return new e(n.highOrder ^ t.highOrder ^ o.highOrder, n.lowOrder ^ t.lowOrder ^ o.lowOrder)
  }

  function U(r) {
    return l(r, 17) ^ l(r, 19) ^ f(r, 10)
  }

  function m(r) {
    var n = s(r, 19),
      t = s(r, 61),
      o = O(r, 6);
    return new e(n.highOrder ^ t.highOrder ^ o.highOrder, n.lowOrder ^ t.lowOrder ^ o.lowOrder)
  }

  function C(r, e) {
    var n = (65535 & r) + (65535 & e);
    return (65535 & (r >>> 16) + (e >>> 16) + (n >>> 16)) << 16 | 65535 & n
  }

  function L(r, e, n, t) {
    var o = (65535 & r) + (65535 & e) + (65535 & n) + (65535 & t);
    return (65535 & (r >>> 16) + (e >>> 16) + (n >>> 16) + (t >>> 16) + (o >>> 16)) << 16 | 65535 & o
  }

  function y(r, e, n, t, o) {
    var h = (65535 & r) + (65535 & e) + (65535 & n) + (65535 & t) + (65535 & o);
    return (65535 & (r >>> 16) + (e >>> 16) + (n >>> 16) + (t >>> 16) + (o >>> 16) + (h >>> 16)) << 16 | 65535 & h
  }

  function R(r, n) {
    var t, o, h;
    return t = (65535 & r.lowOrder) + (65535 & n.lowOrder), h = (65535 & (o = (r.lowOrder >>> 16) + (n.lowOrder >>> 16) + (t >>> 16))) << 16 | 65535 & t, t = (65535 & r.highOrder) + (65535 & n.highOrder) + (o >>> 16), new e((65535 & (o = (r.highOrder >>> 16) + (n.highOrder >>> 16) + (t >>> 16))) << 16 | 65535 & t, h)
  }

  function x(r, n, t, o) {
    var h, i, w;
    return h = (65535 & r.lowOrder) + (65535 & n.lowOrder) + (65535 & t.lowOrder) + (65535 & o.lowOrder), w = (65535 & (i = (r.lowOrder >>> 16) + (n.lowOrder >>> 16) + (t.lowOrder >>> 16) + (o.lowOrder >>> 16) + (h >>> 16))) << 16 | 65535 & h, h = (65535 & r.highOrder) + (65535 & n.highOrder) + (65535 & t.highOrder) + (65535 & o.highOrder) + (i >>> 16), new e((65535 & (i = (r.highOrder >>> 16) + (n.highOrder >>> 16) + (t.highOrder >>> 16) + (o.highOrder >>> 16) + (h >>> 16))) << 16 | 65535 & h, w)
  }

  function B(r, n, t, o, h) {
    var i, w, d;
    return i = (65535 & r.lowOrder) + (65535 & n.lowOrder) + (65535 & t.lowOrder) + (65535 & o.lowOrder) + (65535 & h.lowOrder), d = (65535 & (w = (r.lowOrder >>> 16) + (n.lowOrder >>> 16) + (t.lowOrder >>> 16) + (o.lowOrder >>> 16) + (h.lowOrder >>> 16) + (i >>> 16))) << 16 | 65535 & i, i = (65535 & r.highOrder) + (65535 & n.highOrder) + (65535 & t.highOrder) + (65535 & o.highOrder) + (65535 & h.highOrder) + (w >>> 16), new e((65535 & (w = (r.highOrder >>> 16) + (n.highOrder >>> 16) + (t.highOrder >>> 16) + (o.highOrder >>> 16) + (h.highOrder >>> 16) + (i >>> 16))) << 16 | 65535 & i, d)
  }

  function k(r) {
    var n, t, o;
    if ("SHA-1" === r && 1 & SUPPORTED_ALGS) n = [1732584193, 4023233417, 2562383102, 271733878, 3285377520];
    else {
      if (!(6 & SUPPORTED_ALGS)) throw new Error("No SHA variants supported");
      switch (t = [3238371032, 914150663, 812702999, 4144912697, 4290775857, 1750603025, 1694076839, 3204075428], o = [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225], r) {
        case "SHA-224":
          n = t;
          break;
        case "SHA-256":
          n = o;
          break;
        case "SHA-384":
          n = [new e(3418070365, t[0]), new e(1654270250, t[1]), new e(2438529370, t[2]), new e(355462360, t[3]), new e(1731405415, t[4]), new e(41048885895, t[5]), new e(3675008525, t[6]), new e(1203062813, t[7])];
          break;
        case "SHA-512":
          n = [new e(o[0], 4089235720), new e(o[1], 2227873595), new e(o[2], 4271175723), new e(o[3], 1595750129), new e(o[4], 2917565137), new e(o[5], 725511199), new e(o[6], 4215389547), new e(o[7], 327033209)];
          break;
        default:
          throw new Error("Unknown SHA variant")
      }
    }
    return n
  }

  function D(r, e) {
    var n, t, o, h, i, w, d, u = [],
      l = c,
      s = g,
      f = p,
      O = a,
      S = C,
      E = y;
    for (n = e[0], t = e[1], o = e[2], h = e[3], i = e[4], d = 0; d < 80; d += 1) u[d] = d < 16 ? r[d] : O(u[d - 3] ^ u[d - 8] ^ u[d - 14] ^ u[d - 16], 1), w = d < 20 ? E(O(n, 5), l(t, o, h), i, 1518500249, u[d]) : d < 40 ? E(O(n, 5), s(t, o, h), i, 1859775393, u[d]) : d < 60 ? E(O(n, 5), f(t, o, h), i, 2400959708, u[d]) : E(O(n, 5), s(t, o, h), i, 3395469782, u[d]), i = h, h = o, o = O(t, 30), t = n, n = w;
    return e[0] = S(n, e[0]), e[1] = S(t, e[1]), e[2] = S(o, e[2]), e[3] = S(h, e[3]), e[4] = S(i, e[4]), e
  }

  function G(r, e, n, t) {
    var o, h, i;
    for (i = 15 + (e + 65 >>> 9 << 4); r.length <= i;) r.push(0);
    for (r[e >>> 5] |= 128 << 24 - e % 32, r[i] = e + n, h = r.length, o = 0; o < h; o += 16) t = D(r.slice(o, o + 16), t);
    return t
  }
  var M, X;

  function _(r, n, t) {
    var o, h, i, w, d, u, a, l, s, f, O, g, k, D, G, _, F, I, Y, N, j, K, Z, z, J, Q, V, W = [];
    if (("SHA-224" === t || "SHA-256" === t) && 2 & SUPPORTED_ALGS) O = 64, k = 1, Z = Number, D = C, G = L, _ = y, F = b, I = U, Y = A, N = T, K = p, j = c, V = M;
    else {
      if ("SHA-384" !== t && "SHA-512" !== t || !(4 & SUPPORTED_ALGS)) throw new Error("Unexpected error in SHA-2 implementation");
      O = 80, k = 2, Z = e, D = R, G = x, _ = B, F = P, I = m, Y = H, N = v, K = E, j = S, V = X
    }
    for (o = n[0], h = n[1], i = n[2], w = n[3], d = n[4], u = n[5], a = n[6], l = n[7], g = 0; g < O; g += 1) g < 16 ? (Q = g * k, z = r.length <= Q ? 0 : r[Q], J = r.length <= Q + 1 ? 0 : r[Q + 1], W[g] = new Z(z, J)) : W[g] = G(I(W[g - 2]), W[g - 7], F(W[g - 15]), W[g - 16]), s = _(l, N(d), j(d, u, a), V[g], W[g]), f = D(Y(o), K(o, h, i)), l = a, a = u, u = d, d = D(w, s), w = i, i = h, h = o, o = D(s, f);
    return n[0] = D(o, n[0]), n[1] = D(h, n[1]), n[2] = D(i, n[2]), n[3] = D(w, n[3]), n[4] = D(d, n[4]), n[5] = D(u, n[5]), n[6] = D(a, n[6]), n[7] = D(l, n[7]), n
  }
  6 & SUPPORTED_ALGS && (M = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298], 4 & SUPPORTED_ALGS && (X = [new e(M[0], 3609767458), new e(M[1], 602891725), new e(M[2], 3964484399), new e(M[3], 2173295548), new e(M[4], 4081628472), new e(M[5], 3053834265), new e(M[6], 2937671579), new e(M[7], 3664609560), new e(M[8], 2734883394), new e(M[9], 1164996542), new e(M[10], 1323610764), new e(M[11], 3590304994), new e(M[12], 4068182383), new e(M[13], 991336113), new e(M[14], 633803317), new e(M[15], 3479774868), new e(M[16], 2666613458), new e(M[17], 944711139), new e(M[18], 2341262773), new e(M[19], 2007800933), new e(M[20], 1495990901), new e(M[21], 1856431235), new e(M[22], 3175218132), new e(M[23], 2198950837), new e(M[24], 3999719339), new e(M[25], 766784016), new e(M[26], 2566594879), new e(M[27], 3203337956), new e(M[28], 1034457026), new e(M[29], 2466948901), new e(M[30], 3758326383), new e(M[31], 168717936), new e(M[32], 1188179964), new e(M[33], 1546045734), new e(M[34], 1522805485), new e(M[35], 2643833823), new e(M[36], 2343527390), new e(M[37], 1014477480), new e(M[38], 1206759142), new e(M[39], 344077627), new e(M[40], 1290863460), new e(M[41], 3158454273), new e(M[42], 3505952657), new e(M[43], 106217008), new e(M[44], 3606008344), new e(M[45], 1432725776), new e(M[46], 1467031594), new e(M[47], 851169720), new e(M[48], 3100823752), new e(M[49], 1363258195), new e(M[50], 3750685593), new e(M[51], 3785050280), new e(M[52], 3318307427), new e(M[53], 3812723403), new e(M[54], 2003034995), new e(M[55], 3602036899), new e(M[56], 1575990012), new e(M[57], 1125592928), new e(M[58], 2716904306), new e(M[59], 442776044), new e(M[60], 593698344), new e(M[61], 3733110249), new e(M[62], 2999351573), new e(M[63], 3815920427), new e(3391569614, 3928383900), new e(3515267271, 566280711), new e(3940187606, 3454069534), new e(4118630271, 4000239992), new e(116418474, 1914138554), new e(174292421, 2731055270), new e(289380356, 3203993006), new e(460393269, 320620315), new e(685471733, 587496836), new e(852142971, 1086792851), new e(1017036298, 365543100), new e(1126000580, 2618297676), new e(1288033470, 3409855158), new e(1501505948, 4234509866), new e(1607167915, 987167468), new e(1816402316, 1246189591)]));
  var F = function(r, e, n) {
    var t, o, a, l, s, f, O, g, c, S = 0,
      p = [],
      E = 0,
      A = r,
      H = !1,
      T = !1,
      v = [],
      b = [],
      P = !1;
    if (t = (c = n || {}).encoding || "UTF8", g = c.numRounds || 1, a = u(e, t), g !== parseInt(g, 10) || 1 > g) throw new Error("numRounds must a integer >= 1");
    if ("SHA-1" === A && 1 & SUPPORTED_ALGS) s = 512, f = D, O = G, l = 160;
    else if (6 & SUPPORTED_ALGS && (f = function(r, e) {
        return _(r, e, A)
      }, O = function(r, e, n, t) {
        return function(r, e, n, t, o) {
          var h, i, w, d, u;
          if (("SHA-224" === o || "SHA-256" === o) && 2 & SUPPORTED_ALGS) w = 15 + (e + 65 >>> 9 << 4), u = 16;
          else {
            if ("SHA-384" !== o && "SHA-512" !== o || !(4 & SUPPORTED_ALGS)) throw new Error("Unexpected error in SHA-2 implementation");
            w = 31 + (e + 129 >>> 10 << 5), u = 32
          }
          for (; r.length <= w;) r.push(0);
          for (r[e >>> 5] |= 128 << 24 - e % 32, r[w] = e + n, i = r.length, h = 0; h < i; h += u) t = _(r.slice(h, h + u), t, o);
          if ("SHA-224" === o && 2 & SUPPORTED_ALGS) d = [t[0], t[1], t[2], t[3], t[4], t[5], t[6]];
          else if ("SHA-256" === o && 2 & SUPPORTED_ALGS) d = t;
          else if ("SHA-384" === o && 4 & SUPPORTED_ALGS) d = [t[0].highOrder, t[0].lowOrder, t[1].highOrder, t[1].lowOrder, t[2].highOrder, t[2].lowOrder, t[3].highOrder, t[3].lowOrder, t[4].highOrder, t[4].lowOrder, t[5].highOrder, t[5].lowOrder];
          else {
            if (!("SHA-512" === o && 4 & SUPPORTED_ALGS)) throw new Error("Unexpected error in SHA-2 implementation");
            d = [t[0].highOrder, t[0].lowOrder, t[1].highOrder, t[1].lowOrder, t[2].highOrder, t[2].lowOrder, t[3].highOrder, t[3].lowOrder, t[4].highOrder, t[4].lowOrder, t[5].highOrder, t[5].lowOrder, t[6].highOrder, t[6].lowOrder, t[7].highOrder, t[7].lowOrder]
          }
          return d
        }(r, e, n, t, A)
      }), "SHA-224" === A && 2 & SUPPORTED_ALGS) s = 512, l = 224;
    else if ("SHA-256" === A && 2 & SUPPORTED_ALGS) s = 512, l = 256;
    else if ("SHA-384" === A && 4 & SUPPORTED_ALGS) s = 1024, l = 384;
    else {
      if (!("SHA-512" === A && 4 & SUPPORTED_ALGS)) throw new Error("Chosen SHA variant is not supported");
      s = 1024, l = 512
    }
    o = k(A), this.setHMACKey = function(r, e, n) {
      var h, i, w, d, a, l;
      if (!0 === T) throw new Error("HMAC key already set");
      if (!0 === H) throw new Error("Cannot set HMAC key after finalizing hash");
      if (!0 === P) throw new Error("Cannot set HMAC key after calling update");
      if (i = (h = u(e, t = (n || {}).encoding || "UTF8")(r)).binLen, w = h.value, l = (d = s >>> 3) / 4 - 1, d < i / 8) {
        for (w = O(w, i, 0, k(A)); w.length <= l;) w.push(0);
        w[l] &= 4294967040
      } else if (d > i / 8) {
        for (; w.length <= l;) w.push(0);
        w[l] &= 4294967040
      }
      for (a = 0; a <= l; a += 1) v[a] = 909522486 ^ w[a], b[a] = 1549556828 ^ w[a];
      o = f(v, o), S = s, T = !0
    }, this.update = function(r) {
      var e, n, t, h, i, w = 0,
        d = s >>> 5;
      for (n = (e = a(r, p, E)).binLen, h = e.value, t = n >>> 5, i = 0; i < t; i += d) w + s <= n && (o = f(h.slice(i, i + d), o), w += s);
      S += w, p = h.slice(w >>> 5), E = n % s, P = !0
    }, this.getHash = function(r, e) {
      var n, t, u;
      if (!0 === T) throw new Error("Cannot call getHash after setting HMAC key");
      switch (u = d(e), r) {
        case "HEX":
          n = function(r) {
            return h(r, u)
          };
          break;
        case "B64":
          n = function(r) {
            return i(r, u)
          };
          break;
        case "BYTES":
          n = w;
          break;
        default:
          throw new Error("format must be HEX, B64, or BYTES")
      }
      if (!1 === H)
        for (o = O(p, E, S, o), t = 1; t < g; t += 1) o = O(o, l, 0, k(A));
      return H = !0, n(o)
    }, this.getHMAC = function(r, e) {
      var n, t, u;
      if (!1 === T) throw new Error("Cannot call getHMAC without first setting HMAC key");
      switch (u = d(e), r) {
        case "HEX":
          n = function(r) {
            return h(r, u)
          };
          break;
        case "B64":
          n = function(r) {
            return i(r, u)
          };
          break;
        case "BYTES":
          n = w;
          break;
        default:
          throw new Error("outputFormat must be HEX, B64, or BYTES")
      }
      return !1 === H && (t = O(p, E, S, o), o = f(b, k(A)), o = O(t, l, s, o)), H = !0, n(o)
    }
  };
  "function" == typeof define && define.amd ? define(function() {
    return F
  }) : "undefined" != typeof exports ? "undefined" != typeof module && module.exports ? module.exports = exports = F : exports = F : r.jsSHA = F
}(this);
