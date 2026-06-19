function makeUrl(url) {
    const u = new URL(url);
    return u.origin + u.pathname;
}

const marksColors = ["#ff9999", "#ffc999", "#ffee99", "#caff99", "#9cff99", "#99ffc0", "#99ffeb", "#99e0ff", "#99b3ff", "#ad99ff", "#e299ff", "#ff99ee", "#ff99bb"];

function getIdFromLastSegment(text) {
    /*
    This function extracts the trailing numeric ID from a given text string.
    The ID need to be the last part of text
     */
    let id = "";

    for (let i = text.length - 1; i >= 0; i--) {
        let char = text.charAt(i);
        if (char >= '0' && char <= '9') {
            id = char + id;
        } else break;

    }
    return id === "" ? null : parseInt(id);
}


//* ------------------------------------------------------------------------------ SETUP
if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === "restoreAllMark") restoreAllMark(msg.data);
        if (msg.action === "placeMark") placeMark(msg.id, msg.range);
        if (msg.action === "getSelectionData") sendResponse(returnSelectionData());
        if (msg.action === "removeMark") removeMark(msg.id);
        if (msg.action === "setupMark") SetupMark().then((res) => sendResponse(res));
        if (msg.action === "goto") goToMarkSmooth(msg.id);
        if (msg.action === "saveScrollPos") savePosition();
        if (msg.action === "changeMarkStyle") lightenMarkStyle(msg.id);
        if (msg.action === "clearFloatBtn") delFloatBtn();
        return true;
    });
}

//*------------------------------------------------------------------------------ PLACE BOOK MARK

//?-------------------------------------------------------------- RESTORE DATA

//! --------------------------------------------------- Check pour site en SPA
let lastUrl = location.href;

const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        exeFirst()
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
//!----------------------------------------------------------------------------

window.addEventListener('load', () => {
    exeFirst()
})

async function exeFirst() {
    console.log('EX-BookMark Setup page')

    const url = makeUrl(window.location.href);
    //? ---------------------------------- RESTORE

    const UrlData = await chrome.storage.local.get([url])

    const Data = UrlData[url];
    if (Data.mark) {
        restoreAllMark(Data.mark);
    }
    const isAutoSave = await chrome.storage.local.get("Auto-Save");
    if (isAutoSave["Auto-Save"]){
        const lastPos = Data?.lastPos ?? 0
        restoreScrollPos(lastPos);
    }







}

//?-------------------------------------------------------------- SAVE SELECTION

document.addEventListener('selectionchange',  spawnFoatingButton);


let floatingBtn = null
async function spawnFoatingButton() {
    const data = await chrome.storage.local.get(["Float-Button"])
    if (!data["Float-Button"]) return;


    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        if (floatingBtn) delFloatBtn();
        return;
    }


    if (!floatingBtn) {
        floatingBtn = document.createElement("button");

        floatingBtn.textContent = "Poser un MarquePage";

        floatingBtn.style.position = "fixed";
        floatingBtn.style.zIndex = "10000";
        floatingBtn.style.background = "#252530";
        floatingBtn.style.color = "#f0eee8";
        floatingBtn.style.border = "1px solid #45455a";
        floatingBtn.style.borderRadius = "10px";
        floatingBtn.style.padding = "8px 14px";
        floatingBtn.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        floatingBtn.style.fontSize = "12px";
        floatingBtn.style.fontWeight = "500";
        floatingBtn.style.cursor = "pointer";
        floatingBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
        floatingBtn.style.transition = "background 0.13s ease, border-color 0.13s ease";

        floatingBtn.addEventListener('mouseenter', () => {
            floatingBtn.style.background = "#2d2d3a";
        });
        floatingBtn.addEventListener('mouseleave', () => {
            floatingBtn.style.background = "#252530";
        });


        document.body.appendChild(floatingBtn);

        floatingBtn.addEventListener('click', () => {
            onFloatBtnClick()
        })


    }

    setupFloatBtnPosition(selection)



}

function onFloatBtnClick(){
    const selectionData = returnSelectionData();
    SetupMark(selectionData).then(delFloatBtn);
}

function delFloatBtn(){
    if (floatingBtn) floatingBtn.remove();
    floatingBtn = null
}


function setupFloatBtnPosition(selection){

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    floatingBtn.style.top = (rect.top - 40) + "px"
    floatingBtn.style.left = (rect.left) + "px"
}


//? ----------------------------------------------------------- SETUP DATA

function returnSelectionData() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed ) return null;
    const range = selection.getRangeAt(0);

    if (testSelectionValidity(range)){
        return { error : "INVALID_SELECTION" }
    }

    return {
        text: range.toString(),
        start: {
            xpath: getXPath(range.startContainer),
            offset: range.startOffset
        },
        end: {
            xpath: getXPath(range.endContainer),
            offset: range.endOffset
        }
    };
}

function getXPath(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentNode;
        const textNodes = [...parent.childNodes].filter(n => n.nodeType === Node.TEXT_NODE);
        const textIdx = textNodes.indexOf(node);
        return getXPath(parent) + `/text()[${textIdx + 1}]`;
    }
    if (node === document.body) return '/html/body';
    const idx = [...node.parentNode.children].filter(c => c.tagName === node.tagName).indexOf(node) + 1;
    return getXPath(node.parentNode) + '/' + node.tagName.toLowerCase() + '[' + idx + ']';
}

function testSelectionValidity(range){
    const blockTagsNotAllowed = ['DIV', 'P', 'SECTION', 'ARTICLE', 'UL', 'OL', 'LI', 'TABLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BR'];
    const content = range.cloneContents();
    const hasNotAllowedBlock = content.querySelector(blockTagsNotAllowed.join(','))

    return !!hasNotAllowedBlock

}


//?-------------------------------------------------------------- SETUP MARK

//? ------------------------------- Place Mark & Restore Range

async function SetupMark() {
        const selection = returnSelectionData();
        if (!selection || selection?.error === "INVALID_SELECTION") {
            spawnAlert(selection.error)
            return null;
        }

        const newId = await SaveMark(selection);
        placeMark(newId, selection);

        return {
            id : newId,
            selection: selection,
        }
}

function SaveMark(range) {
    return new Promise(async (resolve) => {

        const url = makeUrl(window.location.href)

        const ActualData = await chrome.storage.local.get([url]);
        const data = ActualData[url] ?? {};

        let marksList = data.mark ?? [];

        const lastId = marksList[marksList.length-1]?.id ?? "0";
        const newId = `ex-bookmark-mark-n${getIdFromLastSegment(lastId)+1}`;

        marksList = [...marksList, {id: newId, range}];

        data.mark = marksList;

        chrome.storage.local.set({[url]: data}).then(() => resolve(newId));

    });


}


function placeMark(newId, rangeData) {
    //? ------------------------------------------------------------------- FUNC RESTORE
    const range = restoreRange(rangeData);

    const mark = document.createElement("mark");
    mark.id = newId;
    mark.style.backgroundColor = marksColors[(getIdFromLastSegment(newId)-1) % marksColors.length];


    mark.appendChild(range.extractContents());
    range.insertNode(mark);

    window.getSelection().removeAllRanges();


}

function restoreRange(positionData) {

    const startNode = getNodeByXPath(positionData.start.xpath);
    const endNode = getNodeByXPath(positionData.end.xpath);

    if (!startNode || !endNode) {
        console.log('No startNode was found.');
        return null;
    }

    const range = document.createRange();
    range.setStart(startNode, positionData.start.offset);
    range.setEnd(endNode, positionData.end.offset);


    return range;
}

function getNodeByXPath(xpath) {
    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function restoreAllMark(urlData) {
    urlData.forEach(markData => {
        placeMark(markData.id, markData.range);
    });
}

function removeMark(id){
    const mark = document.getElementById(id);

    const markParent = mark.parentNode

    while (mark.firstChild) {
        markParent.insertBefore(mark.firstChild, mark);
    }
    markParent.removeChild(mark);
    markParent.normalize()

}

function lightenMarkStyle(id) {
    id = "#" + id
    const marks = document.querySelectorAll(id);

    marks.forEach((mark) => {
        mark.style.backgroundColor = "transparent" ;
        mark.style.color = "inherit";

        mark.style.textDecoration = "underline";
        mark.style.textDecorationColor = marksColors[(getIdFromLastSegment(mark.id)-1) % marksColors.length ];
        mark.style.textDecorationThickness = "3px";

        mark.removeAttribute("id")
    })


}




//?-------------------------------------------------------------- SCROLL POSITION

function goToMarkSmooth(id){
    const mark = document.getElementById(id);
    if (!mark) return;

    const top = mark.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top, behavior: "smooth" });
}

let scrollTimeout;
document.addEventListener('scroll', async () => {

    spawnFoatingButton()

    const isAutoSave = await chrome.storage.local.get("Auto-Save")

    if (isAutoSave["Auto-Save"]) {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {savePosition()}, 300);
    }


})

async function savePosition() {

    const url = makeUrl(window.location.href);
    const ActualData = await chrome.storage.local.get([url]);
    const data = ActualData[url] ?? {};
    data.lastPos = window.scrollY

    chrome.storage.local.set({[url]: data});

}

function restoreScrollPos(pos) {
    window.scrollTo(0, pos);
}


//!------------------------------------------------------------------ ERROR

function spawnAlert(errorType){
    if(errorType === "INVALID_SELECTION") alert("Marquage impossible : la sélection n'est pas conforme ou inexistante" );
    else alert(`Unknow Error : ${errorType}`);
}







