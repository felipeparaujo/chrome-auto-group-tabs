// @types/chrome is missing a few types so we do this
const chromeTabGroups = (chrome as any).tabGroups
const chromeTabs = (chrome.tabs as any)

function formatUrl(url: string): string {
  const parsedUrl = new URL(url);
  return parsedUrl.host.replace(/^www\./, "");
}

function addToCorrectGroup(tab: chrome.tabs.Tab, groups: any) {
  if (tab.url && (tab as any).groupId === chromeTabGroups.TAB_GROUP_ID_NONE) {
    const host = formatUrl(tab.url);
    for (const group of groups) {
      if (host === group.title) {
        chromeTabs.group({groupId: group.id, tabIds: [tab.id]});
        break;
      }
    }
  }
}

chrome.tabs.onAttached.addListener((tabId: number, attachInfo: chrome.tabs.TabAttachInfo) => {
  chrome.tabs.get(tabId, (tab) => {
    chromeTabGroups.query({windowId: attachInfo.newWindowId}, (groups: any) => {
      addToCorrectGroup(tab, groups)
    })
  })
});

chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  if (changeInfo.status === "loading") {
    chromeTabGroups.query({windowId: tab.windowId}, (groups: any) => {
      addToCorrectGroup(tab, groups);
    })
  }
})

chrome.commands.onCommand.addListener(async (command: string) => {
  if (command === 'group-tabs') {
    const tabs = await chrome.tabs.query({
      currentWindow: true
    })

    const tabsByDomain = new Map<string, number[]>();
    for (const tab of tabs) {
      if (tab.id && tab.url && (tab as any).groupId === chromeTabGroups.TAB_GROUP_ID_NONE) {
        const url = formatUrl(tab.url);
        if (!tabsByDomain.get(url)) {
          tabsByDomain.set(url, [])
        }
        tabsByDomain.get(url)?.push(tab.id);
      }
    }

    for (const [groupName, tabs] of tabsByDomain.entries()) {
      if (tabs.length > 1) {
        chromeTabs.group({tabIds: tabs}, (groupId: number) => {
          chromeTabGroups.update(groupId, {title: groupName})
        })
      }
    }
  }
})
