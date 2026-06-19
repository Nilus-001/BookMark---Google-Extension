
//* ------------------------------------------------------------------------------ TOOLS

const marksColors = ["#ff9999", "#ffc999", "#ffee99", "#caff99", "#9cff99", "#99ffc0", "#99ffeb", "#99e0ff", "#99b3ff", "#ad99ff", "#e299ff", "#ff99ee", "#ff99bb"];

function getIdFromLastSegment(text) {
    /*
    This function extracts the trailing numeric ID from a given text string.
    The ID need to be the last part of text
     */
    let id = "";

    for (let i = text.length - 1; i >= 0; i--) {
        let char = text.charAt(i);
        if (char >= '0' && char <= '9'){
            id = char + id;
        } else break;

    }
    return id === "" ? null : parseInt(id);
}

function getId(id) {
    return document.getElementById(id);
}

async function getPageUrl() {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    return makeUrl(tabs[0].url);
}

function makeUrl(url) {
    const u = new URL(url);
    return u.origin + u.pathname;
}

//*---------------------------------------------------------------------------- START




document.addEventListener('DOMContentLoaded', () => {executePopupLoad()})

async function executePopupLoad() {

    const list = getId("button-mark-list");
    const url = await getPageUrl();



    chrome.storage.local.get([url]).then((res) => {
        restoreAllMarksButtons(res[url].mark,list)
    });

    actualizeCountBadge();

}


//*----------------------------------------------------------------------------- TOGGLE ITEMS

function updateVisualToggle(btn, val){
    const isTrue = val === true;
    btn.setAttribute('aria-checked', String(isTrue));
    btn.classList.toggle('toggle--on', isTrue);
}

document.querySelectorAll('.toggle').forEach(toggleBtn => {
    //?------------------------------------------------------------------------- RESTORE STATUS
    const toggleName = toggleBtn.getAttribute('aria-label');
    chrome.storage.local.get([toggleName]).then((res) =>{
        updateVisualToggle(toggleBtn,res[toggleName])
    });

    //?------------------------------------------------------------------------- CLICK
    toggleBtn.addEventListener('click', () => {
        //?---------------------------------------------------------------------- CHANGE STATE
        const isOn = toggleBtn.getAttribute('aria-checked') === 'true';
        const newState = !isOn;
        updateVisualToggle(toggleBtn,newState)
        
        //?----------------------------------------------------------------------- CALL EXECUTE SCRIPT
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            chrome.scripting.executeScript({
                target : {tabId: activeTab.id},
                func: setToggle,
                args: [toggleName,newState]
            });

            if (toggleName === "Float-Button" ){
                chrome.tabs.sendMessage( activeTab.id, { action: "clearFloatBtn"});
            }
        });
    });
});

function setToggle(toggleName, toggleStatus) {
    chrome.storage.local.set({[toggleName]:toggleStatus});

}


//*------------------------------------------------------------------------------  BOOK MARK

//?-------------------------------------------------------------- CLICK
getId("btn-place").addEventListener('click', OnClickPlaceMark);

function OnClickPlaceMark() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const activeTab = tabs[0];
        //? -------------------------------------------RECUPERATION DATA SELECTION
        chrome.tabs.sendMessage(activeTab.id, { action: "setupMark"}, (results) => {  //*--------------------------------------------- FUNC EXECUTE

            if (results === null) return;

            const list = getId("button-mark-list")

            createMarkButton(list,results.id,results.selection.text)
            actualizeCountBadge();

        });
    });
}

//?-------------------------------------------------------------- SAVE DATA



//*------------------------------------------------------------------------------  BOOK MARK BUTTON

function createMarkButton(eleParent, id, text, comment = ""){
    const markButton = document.createElement("li")


    const color = marksColors[(getIdFromLastSegment(id)-1 )% marksColors.length];
    const textContent = text.length > 35 ? text.substring(0, 35) + "..." : text;


    markButton.innerHTML = `
        <span class="bm-dot" style="background-color: ${color}" aria-hidden="true"></span>
        <div class="bm-info">
            <span class="bm-word">${textContent}</span>
            <input class="bm-context" id="comment-input" type="text" disabled placeholder="sans commentaire" value="${comment}"></input>
        </div>
        <div class="bm-actions">
            <button class="bm-act bm-del" aria-label="Delete"><i class="ti ti-trash" aria-hidden="true"></i></button>
            <button class="bm-act bm-edit" aria-label="Edit"><i class="ti ti-pencil" aria-hidden="true"></i></button>
        </div>
    `
    markButton.classList.add("bm-item");
    markButton.setAttribute("markid", id );

    eleParent.appendChild(markButton);

    addCheckMarkButton(markButton);


}

function restoreAllMarksButtons(data, parent) {
    data.forEach(markData => {
        createMarkButton(parent, markData.id,markData.range.text,markData.comment)
    });
}


function addCheckMarkButton(button){
        const id = button.getAttribute('markid');

        button.querySelector(".bm-del").addEventListener('click', () => {removeMark(button)});

        const comment = button.querySelector("input")

        comment.addEventListener('blur',() => {endCommentModification(comment,id)});
        comment.addEventListener('keydown', (e) => {if (e.key === 'Enter') comment.blur()});

        button.querySelector(".bm-edit").addEventListener('click', () => {editMarkComment(comment)});

        button.addEventListener('click',() => {goToMark(id)});

}

function goToMark(id){
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "goto",
            id : id
        });
    });
}

async function removeMark(markButton) {

    const url = await getPageUrl();
    const ActualData = await chrome.storage.local.get([url])
    const data = ActualData[url] ?? {};

    let marksList = data.mark ?? [];
    const id = markButton.getAttribute('markid')

    //*-------------------------------------------- Remove from data

    data.mark = marksList.filter(mark => mark.id !== id)


    chrome.storage.local.set({[url]: data});
    //*-------------------------------------------- Change style from page
    await chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "changeMarkStyle",  //*--------------------------------------------- FUNC EXECUTE
            id: id
        }); //? "removeMark" is want remove completely
    });
    //*-------------------------------------------- Remove from popup
    markButton.remove();

    actualizeCountBadge();

}

document.querySelector(".clear-link").addEventListener('click',  () => {removeAllMarks()});

async function removeAllMarks() {
    const marks = [...document.querySelectorAll(".bm-item")];
    for (const markButton of marks) {
        await removeMark(markButton);
    }
}

function editMarkComment(input) {
    input.disabled = false;
    input.focus()
    input.select()

}

async function endCommentModification(input,id) {
    const url = await getPageUrl();
    const ActualData = await chrome.storage.local.get([url]);
    const data = ActualData[url];
    const i = data?.mark ?? [];
    const markIndex = i.findIndex((mark) => mark.id === id)

    data.mark[markIndex].comment = input.value;

    chrome.storage.local.set({[url]: data})

    input.disabled = true;

}

//*------------------------------------------------------------------------------  OTHER

async function actualizeCountBadge(){
    const url = await getPageUrl();
    const res = await chrome.storage.local.get([url]);
    const i = res[url]?.mark ?? [];


    const countBadge = document.querySelector('.count-badge');
    countBadge.textContent = i.length.toString();


}

