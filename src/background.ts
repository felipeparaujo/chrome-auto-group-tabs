// @types/chrome is missing a few types so we do this
const chromeTabGroups = (chrome as any).tabGroups
const chromeTabs = (chrome.tabs as any)

function formatUrl(url: string): string {
  const parsedUrl = new URL(url);
  return parsedUrl.host.replace(/^www\./, "");
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && changeInfo.url && (tab as any).groupId === chromeTabGroups.TAB_GROUP_ID_NONE) {
    const host = formatUrl(changeInfo.url);
    chromeTabGroups.query({title: host}, (result: any) => {
      if (result.length === 1 && result[0].windowId === tab.windowId) {
        chromeTabs.group({groupId: result[0].id, tabIds: [tabId]})
      }
    })
  }
})

chrome.commands.onCommand.addListener(async (command) => {
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
