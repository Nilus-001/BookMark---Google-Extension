chrome.storage.onChanged.addListener((changes, areaName) => {

    if (areaName === 'local') {
        for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
            console.log(`La clé "${key}" a été modifiée dans le stockage.`);
            console.log(`Ancienne valeur :`, oldValue);
            console.log(`Nouvelle valeur :`, newValue);
        }
    }
});





chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "bookmark-parent",
        title: "BookMark Extension - Bookmark",
        contexts: ["selection"]
    });

    chrome.contextMenus.create({
        id: "bookmark-add",
        parentId: "bookmark-parent",
        title: "Marquer la sélection",
        contexts: ["selection"]
    });
});



chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "bookmark-add") {
        chrome.tabs.sendMessage(tab.id, {
            action: "setupMark", //*-------------------------------- FUNC EXECUTE
        });
    }
});


//todo : if not flemme :
//todo : bouton gerer -> panel des data + suppression
//todo : bouton gerer -> blacklist url
//todo : bouton gerer -> setting auto suppression
