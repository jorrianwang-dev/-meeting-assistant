const STORAGE_KEY = "meetingAssistantDemoV5";
const AgendaTypeOptions = [
  { value: "OPENING", label: "开场" },
  { value: "IMPORT", label: "导入" },
  { value: "DISCUSS", label: "讨论" },
  { value: "LUNCH", label: "午休" },
  { value: "CONVERGE", label: "收敛" },
];

let state = { meetings: [], selectedMeetingId: null };

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.meetings)) {
      state.meetings = parsed.meetings;
      state.selectedMeetingId = parsed.selectedMeetingId || null;
    }
  } catch (e) {
    console.error("loadState error", e);
  }
}
function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ meetings: state.meetings, selectedMeetingId: state.selectedMeetingId })
  );
}
function getSelectedMeeting() {
  return state.meetings.find((m) => m.id === state.selectedMeetingId) || null;
}

function showSection(section) {
  ["board", "location", "agenda", "participants", "output"].forEach((id) => {
    const el = document.getElementById("section-" + id);
    if (el) el.hidden = id !== section;
  });
}
function setCurrentSection(section) {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.section === section);
  });
  if (section !== "board" && !getSelectedMeeting()) {
    alert("请先在会议看板中新建并选择一个会议。");
    showSection("board");
    renderBoardSection();
    return;
  }
  showSection(section);
  renderAllSections();
}

// 小头像 chip
function createPersonChip(person) {
  const chip = document.createElement("span");
  chip.className = "person-chip";
  const avatar = document.createElement("span");
  avatar.className = "person-avatar";
  const name = (person.name || "?").trim();
  const firstChar = name ? name.charAt(0) : "?";
  avatar.textContent = firstChar;
  const nameSpan = document.createElement("span");
  nameSpan.textContent = person.name || "";
  chip.appendChild(avatar);
  chip.appendChild(nameSpan);
  return chip;
}

// 会议看板
function renderBoardSection() {
  const listEl = document.getElementById("meetingTabs");
  const emptyHint = document.getElementById("boardEmptyHint");
  listEl.innerHTML = "";
  if (state.meetings.length === 0) {
    emptyHint.hidden = false;
    return;
  }
  emptyHint.hidden = true;
  state.meetings
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt)
    .forEach((m) => {
      const tab = document.createElement("div");
      tab.className = "meeting-tab" + (m.id === state.selectedMeetingId ? " selected" : "");
      const main = document.createElement("div");
      main.className = "meeting-tab-main";
      const nameSpan = document.createElement("span");
      nameSpan.className = "meeting-tab-name";
      nameSpan.textContent = m.name;
      main.appendChild(nameSpan);
      tab.appendChild(main);
      const actions = document.createElement("div");
      actions.className = "meeting-tab-actions";
      const btnEdit = document.createElement("button");
      btnEdit.className = "edit";
      btnEdit.textContent = "编辑";
      btnEdit.addEventListener("click", (e) => {
        e.stopPropagation();
        state.selectedMeetingId = m.id;
        saveState();
        updateCurrentMeetingDisplay();
        setCurrentSection("location");
      });
      const btnDelete = document.createElement("button");
      btnDelete.className = "delete";
      btnDelete.textContent = "删除";
      btnDelete.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!confirm("您是否要删除该会议信息？")) return;
        state.meetings = state.meetings.filter((mm) => mm.id !== m.id);
        if (state.selectedMeetingId === m.id) state.selectedMeetingId = null;
        saveState();
        updateCurrentMeetingDisplay();
        renderAllSections();
      });
      actions.appendChild(btnEdit);
      actions.appendChild(btnDelete);
      tab.addEventListener("click", () => {
        state.selectedMeetingId = m.id;
        saveState();
        updateCurrentMeetingDisplay();
        renderAllSections();
      });
      tab.appendChild(actions);
      listEl.appendChild(tab);
    });
}
function updateCurrentMeetingDisplay() {
  const span = document.getElementById("currentMeetingName");
  const m = getSelectedMeeting();
  span.textContent = m ? m.name : "未选择";
}
function handleAddMeeting() {
  const name = prompt("请输入会议名称：");
  if (!name) return;
  const id = "m-" + Date.now();
  const meeting = {
    id,
    name,
    createdAt: Date.now(),
    location: { address: "", hasWorkOrder: false },
    startTime: "09:00",
    agendaItems: [],
    participants: [],
    groups: [],
    groupsSaved: false,
  };
  state.meetings.push(meeting);
  state.selectedMeetingId = id;
  saveState();
  updateCurrentMeetingDisplay();
  setCurrentSection("location");
}

// 会议地点
function renderLocationSection() {
  const noMeetingEl = document.getElementById("locationNoMeeting");
  const formEl = document.getElementById("locationForm");
  const meeting = getSelectedMeeting();
  if (!meeting) {
    noMeetingEl.hidden = false;
    formEl.hidden = true;
    return;
  }
  noMeetingEl.hidden = true;
  formEl.hidden = false;
  const inputAddress = document.getElementById("inputAddress");
  const toggle = document.getElementById("toggleWorkOrder");
  const label = document.getElementById("toggleWorkOrderLabel");
  inputAddress.value = meeting.location?.address || "";
  const hasWorkOrder = !!meeting.location?.hasWorkOrder;
  toggle.classList.toggle("on", hasWorkOrder);
  label.textContent = hasWorkOrder ? "已拉" : "没有";
}
function saveLocation(goNext) {
  const meeting = getSelectedMeeting();
  if (!meeting) return;
  const inputAddress = document.getElementById("inputAddress");
  const toggle = document.getElementById("toggleWorkOrder");
  const hasWorkOrder = toggle.classList.contains("on");
  meeting.location = { address: inputAddress.value.trim(), hasWorkOrder };
  saveState();
  if (goNext) setCurrentSection("agenda");
  else alert("地点信息已保存。");
}
function setupLocationEvents() {
  const toggle = document.getElementById("toggleWorkOrder");
  const label = document.getElementById("toggleWorkOrderLabel");
  toggle.addEventListener("click", () => {
    toggle.classList.toggle("on");
    const on = toggle.classList.contains("on");
    label.textContent = on ? "已拉" : "没有";
  });
  document.getElementById("btnLocationSave").addEventListener("click", () => saveLocation(false));
  document.getElementById("btnLocationNext").addEventListener("click", () => saveLocation(true));
}

// 议程
function minutesToTime(total) {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function computeAgendaTimes(startTime, items) {
  const result = [];
  let [h, m] = (startTime || "09:00").split(":").map((v) => Number(v));
  let currentMinutes = h * 60 + m;
  for (const it of items) {
    const duration = Number(it.durationMinutes || 0);
    const begin = currentMinutes;
    const end = begin + duration;
    const beginText = minutesToTime(begin);
    const endText = minutesToTime(end);
    result.push({ ...it, timeText: duration > 0 ? `${beginText} - ${endText}` : "" });
    currentMinutes = end;
  }
  return result;
}
function collectAgendaFromDom() {
  const tbody = document.getElementById("agendaTbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const items = [];
  rows.forEach((tr) => {
    const tds = tr.querySelectorAll("td");
    const select = tds[1].querySelector("select");
    const inputTitle = tds[2].querySelector("input");
    const inputOwner = tds[3].querySelector("input");
    const inputDuration = tds[4].querySelector("input");
    const title = inputTitle.value.trim();
    const owner = inputOwner.value.trim();
    const duration = Number(inputDuration.value || 0);
    const type = select.value;
    if (!title && !owner && duration === 0) return;
    items.push({ type, title, owner, durationMinutes: duration });
  });
  return items;
}
function refreshAgendaTimes() {
  const meeting = getSelectedMeeting();
  if (!meeting) return;
  meeting.agendaItems = collectAgendaFromDom();
  saveState();
  renderAgendaSection();
}
function createAgendaRow(item, index) {
  const tr = document.createElement("tr");
  tr.className = "agenda-row";
  if (item.type === "LUNCH") tr.classList.add("lunch");
  tr.draggable = true;
  const tdDrag = document.createElement("td");
  tdDrag.innerHTML = '<span class="drag-handle">⋮⋮</span>';
  tr.appendChild(tdDrag);
  const tdType = document.createElement("td");
  const select = document.createElement("select");
  AgendaTypeOptions.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    if (item.type === opt.value) option.selected = true;
    select.appendChild(option);
  });
  select.addEventListener("change", () => {
    if (select.value === "LUNCH") tr.classList.add("lunch");
    else tr.classList.remove("lunch");
    refreshAgendaTimes();
  });
  tdType.appendChild(select);
  tr.appendChild(tdType);
  const tdTitle = document.createElement("td");
  const inputTitle = document.createElement("input");
  inputTitle.type = "text";
  inputTitle.value = item.title || "";
  inputTitle.addEventListener("change", refreshAgendaTimes);
  tdTitle.appendChild(inputTitle);
  tr.appendChild(tdTitle);
  const tdOwner = document.createElement("td");
  const inputOwner = document.createElement("input");
  inputOwner.type = "text";
  inputOwner.value = item.owner || "";
  inputOwner.addEventListener("change", refreshAgendaTimes);
  tdOwner.appendChild(inputOwner);
  tr.appendChild(tdOwner);
  const tdDuration = document.createElement("td");
  const inputDuration = document.createElement("input");
  inputDuration.type = "number";
  inputDuration.min = "0";
  inputDuration.max = "120";
  inputDuration.step = "10";
  inputDuration.value = item.durationMinutes ?? 0;
  inputDuration.addEventListener("change", () => {
    const val = Number(inputDuration.value || 0);
    if (val < 0 || val > 120 || val % 10 !== 0) {
      inputDuration.classList.add("input-error");
    } else {
      inputDuration.classList.remove("input-error");
      refreshAgendaTimes();
    }
  });
  tdDuration.appendChild(inputDuration);
  tr.appendChild(tdDuration);
  const tdTime = document.createElement("td");
  tdTime.textContent = item.timeText || "";
  tr.appendChild(tdTime);
  const tdActions = document.createElement("td");
  const btnDel = document.createElement("button");
  btnDel.className = "btn small secondary";
  btnDel.textContent = "×";
  btnDel.addEventListener("click", () => {
    const meeting = getSelectedMeeting();
    if (!meeting) return;
    meeting.agendaItems.splice(index, 1);
    saveState();
    renderAgendaSection();
  });
  tdActions.appendChild(btnDel);
  tr.appendChild(tdActions);
  tr.addEventListener("dragstart", (e) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  });
  tr.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });
  tr.addEventListener("drop", (e) => {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData("text/plain"));
    const toIndex = index;
    reorderAgenda(fromIndex, toIndex);
  });
  return tr;
}
function reorderAgenda(fromIndex, toIndex) {
  const meeting = getSelectedMeeting();
  if (!meeting) return;
  const items = meeting.agendaItems || [];
  if (
    fromIndex < 0 ||
    fromIndex >= items.length ||
    toIndex < 0 ||
    toIndex >= items.length
  )
    return;
  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);
  meeting.agendaItems = items;
  saveState();
  renderAgendaSection();
}
function renderAgendaSection() {
  const noMeetingEl = document.getElementById("agendaNoMeeting");
  const formEl = document.getElementById("agendaForm");
  const meeting = getSelectedMeeting();
  if (!meeting) {
    noMeetingEl.hidden = false;
    formEl.hidden = true;
    return;
  }
  noMeetingEl.hidden = true;
  formEl.hidden = false;
  const inputStartTime = document.getElementById("inputStartTime");
  inputStartTime.value = meeting.startTime || "09:00";
  inputStartTime.onchange = () => {
    const m = getSelectedMeeting();
    if (!m) return;
    m.startTime = inputStartTime.value || "09:00";
    saveState();
    renderAgendaSection();
  };
  const tbody = document.getElementById("agendaTbody");
  tbody.innerHTML = "";
  const withTime = computeAgendaTimes(meeting.startTime, meeting.agendaItems || []);
  withTime.forEach((item, index) => tbody.appendChild(createAgendaRow(item, index)));
}
function saveAgenda(goNext) {
  const meeting = getSelectedMeeting();
  if (!meeting) return;
  const inputStartTime = document.getElementById("inputStartTime");
  meeting.startTime = inputStartTime.value || "09:00";
  meeting.agendaItems = collectAgendaFromDom();
  saveState();
  if (goNext) setCurrentSection("participants");
  else alert("议程已保存。");
}
function setupAgendaEvents() {
  document.getElementById("btnAddAgendaItem").addEventListener("click", () => {
    const meeting = getSelectedMeeting();
    if (!meeting) return;
    meeting.agendaItems.push({ type: "DISCUSS", title: "", owner: "", durationMinutes: 30 });
    saveState();
    renderAgendaSection();
  });
  document.getElementById("btnAgendaSave").addEventListener("click", () => saveAgenda(false));
  document.getElementById("btnAgendaNext").addEventListener("click", () => saveAgenda(true));
}

// 人员名单渲染
function renderParticipantsSection() {
  const noMeetingEl = document.getElementById("participantsNoMeeting");
  const contentEl = document.getElementById("participantsContent");
  const meeting = getSelectedMeeting();
  if (!meeting) {
    noMeetingEl.hidden = false;
    contentEl.hidden = true;
    return;
  }
  noMeetingEl.hidden = true;
  contentEl.hidden = false;
  renderParticipantsList();
  renderGroups();
}
function renderParticipantsList() {
  const meeting = getSelectedMeeting();
  if (!meeting) return;
  const container = document.getElementById("participantsList");
  container.innerHTML = "";
  const participants = meeting.participants || [];
  if (participants.length === 0) {
    container.textContent = "暂未添加人员。";
    return;
  }
  const table = document.createElement("table");
  table.className = "participants-table";
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>部门</th><th>姓名</th><th style='width:60px'>操作</th></tr>";
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  participants.forEach((p) => {
    const tr = document.createElement("tr");
    const tdDept = document.createElement("td");
    const inputDept = document.createElement("input");
    inputDept.type = "text";
    inputDept.value = p.dept || "";
    inputDept.addEventListener("change", () => {
      p.dept = inputDept.value.trim();
      meeting.groupsSaved = false;
      saveState();
      renderGroups();
    });
    tdDept.appendChild(inputDept);
    const tdName = document.createElement("td");
    const inputName = document.createElement("input");
    inputName.type = "text";
    inputName.value = p.name || "";
    inputName.addEventListener("change", () => {
      p.name = inputName.value.trim();
      meeting.groupsSaved = false;
      saveState();
      renderGroups();
    });
    tdName.appendChild(inputName);
    const tdOp = document.createElement("td");
    const btnDel = document.createElement("button");
    btnDel.className = "btn small secondary";
    btnDel.textContent = "删";
    btnDel.addEventListener("click", () => {
      if (!confirm("确定删除该人员？")) return;
      const idx = meeting.participants.findIndex((x) => x.id === p.id);
      if (idx >= 0) meeting.participants.splice(idx, 1);
      (meeting.groups || []).forEach((g) => {
        g.memberIds = (g.memberIds || []).filter((id) => id !== p.id);
        if (g.leaderId === p.id) g.leaderId = null;
      });
      meeting.groupsSaved = false;
      saveState();
      renderParticipantsList();
      renderGroups();
    });
    tdOp.appendChild(btnDel);
    tr.appendChild(tdDept);
    tr.appendChild(tdName);
    tr.appendChild(tdOp);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

// 组长 & 分组
function setupMemberCardDrag(card) {
  card.addEventListener("dragstart", (e) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("participantId", card.dataset.participantId);
    e.dataTransfer.setData("fromGroupId", card.dataset.groupId || "");
  });
}
function moveParticipantBetweenGroups(pid, fromGroupId, toGroupId) {
  if (!pid || !toGroupId) return;
  const meeting = getSelectedMeeting();
  if (!meeting) return;
  const groups = meeting.groups || [];
  const to = groups.find((g) => g.id === toGroupId);
  if (!to) return;
  groups.forEach((g) => {
    g.memberIds = (g.memberIds || []).filter((id) => id !== pid);
  });
  if (!to.memberIds) to.memberIds = [];
  to.memberIds.push(pid);
  meeting.groupsSaved = false;
  saveState();
  renderGroups();
}
function setGroupLeader(pid, fromGroupId, groupId) {
  const meeting = getSelectedMeeting();
  if (!meeting) return;
  const groups = meeting.groups || [];
  const target = groups.find((g) => g.id === groupId);
  if (!target) return;
  groups.forEach((g) => {
    g.memberIds = (g.memberIds || []).filter((id) => id !== pid);
    if (g.leaderId === pid && g.id !== groupId) g.leaderId = null;
  });
  target.leaderId = pid;
  meeting.groupsSaved = false;
  saveState();
  renderGroups();
}
function clearGroupLeader(groupId, pushBackToMembers) {
  const meeting = getSelectedMeeting();
  if (!meeting) return;
  const groups = meeting.groups || [];
  const g = groups.find((x) => x.id === groupId);
  if (!g || !g.leaderId) return;
  const pid = g.leaderId;
  if (pushBackToMembers) {
    if (!g.memberIds) g.memberIds = [];
    if (!g.memberIds.includes(pid)) g.memberIds.unshift(pid);
  }
  g.leaderId = null;
  meeting.groupsSaved = false;
  saveState();
  renderGroups();
}
function renderGroups() {
  const meeting = getSelectedMeeting();
  if (!meeting) return;
  const container = document.getElementById("groupsContainer");
  container.innerHTML = "";
  const groups = meeting.groups || [];
  const participants = meeting.participants || [];
  if (groups.length === 0) {
    container.textContent = '还未分组，可在上方输入组数后点击"一键分组"。';
    return;
  }
  groups.forEach((g) => {
    const col = document.createElement("div");
    col.className = "group-column";
    col.dataset.groupId = g.id;
    const title = document.createElement("div");
    title.className = "group-title";
    title.textContent = g.name + (meeting.groupsSaved ? "（已保存）" : "");
    col.appendChild(title);
    const leaderSlot = document.createElement("div");
    leaderSlot.className = "leader-slot";
    leaderSlot.dataset.groupId = g.id;
    const label = document.createElement("span");
    label.className = "leader-label";
    label.textContent = "组长：";
    leaderSlot.appendChild(label);
    const leaderContainer = document.createElement("span");
    leaderContainer.className = "leader-container";
    if (g.leaderId) {
      const leader = participants.find((p) => p.id === g.leaderId);
      if (leader) {
        const chip = createPersonChip(leader);
        chip.dataset.participantId = leader.id;
        chip.dataset.groupId = g.id;
        chip.draggable = true;
        setupMemberCardDrag(chip);
        leaderContainer.appendChild(chip);
        const btnX = document.createElement("button");
        btnX.className = "leader-remove";
        btnX.textContent = "×";
        btnX.title = "取消组长";
        btnX.addEventListener("click", () => clearGroupLeader(g.id, true));
        leaderContainer.appendChild(btnX);
      }
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "leader-placeholder";
      placeholder.textContent = "（将人员拖拽到此处设为组长）";
      leaderContainer.appendChild(placeholder);
    }
    leaderSlot.appendChild(leaderContainer);
    leaderSlot.addEventListener("dragover", (e) => {
      e.preventDefault();
      leaderSlot.classList.add("drag-over");
    });
    leaderSlot.addEventListener("dragleave", () => leaderSlot.classList.remove("drag-over"));
    leaderSlot.addEventListener("drop", (e) => {
      e.preventDefault();
      leaderSlot.classList.remove("drag-over");
      const pid = e.dataTransfer.getData("participantId");
      const fromGroupId = e.dataTransfer.getData("fromGroupId");
      if (pid) setGroupLeader(pid, fromGroupId, g.id);
    });
    col.appendChild(leaderSlot);
    const membersDiv = document.createElement("div");
    membersDiv.className = "group-members";
    (g.memberIds || []).forEach((pid) => {
      const p = participants.find((x) => x.id === pid);
      if (!p) return;
      const card = document.createElement("div");
      card.className = "member-card";
      card.textContent = `${p.name}（${p.dept || ""}）`;
      card.draggable = true;
      card.dataset.participantId = p.id;
      card.dataset.groupId = g.id;
      setupMemberCardDrag(card);
      membersDiv.appendChild(card);
    });
    col.appendChild(membersDiv);
    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      col.classList.add("drag-over");
    });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");
      const pid = e.dataTransfer.getData("participantId");
      const fromGroupId = e.dataTransfer.getData("fromGroupId");
      if (pid) moveParticipantBetweenGroups(pid, fromGroupId, g.id);
    });
    container.appendChild(col);
  });
}

// 一键分组：随机 + 部门打散 + 人数均分 + 组长固定
function autoGroup() {
  const meeting = getSelectedMeeting();
  if (!meeting) return;
  const participants = meeting.participants || [];
  if (participants.length === 0) {
    alert("请先添加会议人员。");
    return;
  }
  const input = document.getElementById("inputGroupCount");
  let n = Number(input.value || 0);
  if (!Number.isInteger(n) || n < 1 || n > 100) {
    alert("组数格式不正确，请输入 1-100 的整数。");
    return;
  }
  if (n > participants.length) {
    n = participants.length;
    input.value = String(n);
  }
  if (meeting.groups && meeting.groups.length > 0 && meeting.groupsSaved) {
    const ok = confirm("您的旧分组将不会被保存，确定重新分组吗？");
    if (!ok) return;
  }
  const oldGroups = meeting.groups || [];
  const leaderIdsByIndex = [];
  for (let i = 0; i < n; i++) {
    const g = oldGroups[i];
    leaderIdsByIndex[i] = g && g.leaderId ? g.leaderId : null;
  }
  const groups = [];
  for (let i = 0; i < n; i++) {
    groups.push({
      id: "g-" + Date.now() + "-" + i + "-" + Math.random().toString(16).slice(2),
      name: `第${i + 1}组`,
      memberIds: [],
      leaderId: leaderIdsByIndex[i] || null,
    });
  }
  const leadersSet = new Set(leaderIdsByIndex.filter(Boolean));
  const assignable = participants
    .filter((p) => !leadersSet.has(p.id))
    .slice()
    .sort(() => Math.random() - 0.5);
  const groupDeptCount = new Map();
  groups.forEach((g) => {
    const map = new Map();
    if (g.leaderId) {
      const leader = participants.find((p) => p.id === g.leaderId);
      if (leader) {
        const dept = leader.dept || "未分配部门";
        map.set(dept, 1);
      }
    }
    groupDeptCount.set(g.id, map);
  });
  assignable.forEach((p) => {
    const dept = p.dept || "未分配部门";
    let minSize = Infinity;
    groups.forEach((g) => {
      const size = g.memberIds.length + (g.leaderId ? 1 : 0);
      if (size < minSize) minSize = size;
    });
    const candidateGroups = groups.filter(
      (g) => g.memberIds.length + (g.leaderId ? 1 : 0) === minSize
    );
    let bestGroup = candidateGroups[0];
    let bestDeptCount = Infinity;
    candidateGroups.forEach((g) => {
      const deptMap = groupDeptCount.get(g.id);
      const c = deptMap.get(dept) || 0;
      if (c < bestDeptCount) {
        bestDeptCount = c;
        bestGroup = g;
      }
    });
    bestGroup.memberIds.push(p.id);
    const deptMap = groupDeptCount.get(bestGroup.id);
    deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
  });
  meeting.groups = groups;
  meeting.groupsSaved = false;
  saveState();
  renderGroups();
}

// 批量添加人员 + 分组按钮
function setupParticipantsEvents() {
  const tabButtons = document.querySelectorAll(".tab-button");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.partTab;
      document.getElementById("tabGrouping").hidden = tab !== "grouping";
      document.getElementById("tabCheck").hidden = tab !== "check";
    });
  });
  document.getElementById("btnAddParticipant").addEventListener("click", () => {
    const meeting = getSelectedMeeting();
    if (!meeting) return;
    const inputName = document.getElementById("inputParticipantName");
    const inputDept = document.getElementById("inputParticipantDept");
    const rawNames = inputName.value;
    const dept = inputDept.value.trim();
    if (!rawNames || !rawNames.trim()) {
      alert("请输入人员姓名（可多个）。");
      return;
    }
    if (!dept) {
      alert("请输入部门。");
      return;
    }
    const names = rawNames
      .split(/[、，,;；@\s\n\r]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (names.length === 0) {
      alert("未解析出有效的姓名，请检查输入格式。");
      return;
    }
    names.forEach((name) => {
      const id = "p-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      meeting.participants.push({ id, name, dept });
    });
    meeting.groupsSaved = false;
    inputName.value = "";
    inputDept.value = "";
    saveState();
    renderParticipantsList();
    renderGroups();
  });
  document.getElementById("btnAutoGroup").addEventListener("click", autoGroup);
  const btnSaveGroups = document.getElementById("btnSaveGroups");
  if (btnSaveGroups) {
    btnSaveGroups.addEventListener("click", () => {
      const meeting = getSelectedMeeting();
      if (!meeting) return;
      if (!meeting.groups || meeting.groups.length === 0) {
        alert("当前还没有分组结果，请先点击'一键分组'。");
        return;
      }
      meeting.groupsSaved = true;
      saveState();
      alert("当前分组已保存。");
      renderGroups();
    });
  }
  document.getElementById("btnCheck").addEventListener("click", runCheck);
  document.getElementById("btnParticipantsSave").addEventListener("click", () => {
    saveState();
    alert("人员信息已保存。");
  });
  document.getElementById("btnParticipantsNext").addEventListener("click", () => {
    saveState();
    setCurrentSection("output");
  });
}

// 人员检测
function collectCheckNamesFromTextarea() {
  const textarea = document.getElementById("textareaCheck");
  return textarea.value
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
function runCheck() {
  const meeting = getSelectedMeeting();
  if (!meeting) return;
  const expected = new Set((meeting.participants || []).map((p) => p.name.trim()));
  const actual = new Set(collectCheckNamesFromTextarea());
  const missing = [];
  expected.forEach((name) => {
    if (!actual.has(name)) missing.push(name);
  });
  const extra = [];
  actual.forEach((name) => {
    if (!expected.has(name)) extra.push(name);
  });
  const missingList = document.getElementById("missingList");
  const extraList = document.getElementById("extraList");
  missingList.innerHTML = "";
  extraList.innerHTML = "";
  (missing.length ? missing : ["无"]).forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    missingList.appendChild(li);
  });
  (extra.length ? extra : ["无"]).forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    extraList.appendChild(li);
  });
}

// 信息输出
function renderOutputSection() {
  const noMeetingEl = document.getElementById("outputNoMeeting");
  const contentEl = document.getElementById("outputContent");
  const meeting = getSelectedMeeting();
  if (!meeting) {
    noMeetingEl.hidden = false;
    contentEl.hidden = true;
    return;
  }
  noMeetingEl.hidden = true;
  contentEl.hidden = false;
  document.getElementById("outMeetingName").textContent = meeting.name;
  const loc = meeting.location || { address: "" };
  const locText = loc.address ? `地址：${loc.address}` : "地址：未填写";
  document.getElementById("outLocationText").textContent = locText;
  const outAgendaTbody = document.getElementById("outAgendaTbody");
  outAgendaTbody.innerHTML = "";
  const withTime = computeAgendaTimes(meeting.startTime, meeting.agendaItems || []);
  const typeLabelMap = new Map(AgendaTypeOptions.map((o) => [o.value, o.label]));
  withTime.forEach((item) => {
    const tr = document.createElement("tr");
    [
      typeLabelMap.get(item.type) || "",
      item.title || "",
      item.owner || "",
      item.durationMinutes || 0,
      item.timeText || "",
    ].forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
    outAgendaTbody.appendChild(tr);
  });
  const outDept = document.getElementById("outParticipantsByDept");
  outDept.innerHTML = "";
  const participants = meeting.participants || [];
  if (participants.length > 0) {
    const byDept = new Map();
    participants.forEach((p) => {
      const dept = p.dept || "未分配部门";
      if (!byDept.has(dept)) byDept.set(dept, []);
      byDept.get(dept).push(p);
    });
    const table = document.createElement("table");
    table.className = "output-table";
    const thead = document.createElement("thead");
    thead.innerHTML = "<tr><th>部门</th><th>姓名</th></tr>";
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    for (const [dept, people] of byDept.entries()) {
      const tr = document.createElement("tr");
      const tdDept = document.createElement("td");
      tdDept.textContent = dept;
      const tdNames = document.createElement("td");
      people.forEach((p) => tdNames.appendChild(createPersonChip(p)));
      tr.appendChild(tdDept);
      tr.appendChild(tdNames);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    outDept.appendChild(table);
  }
  const outGroups = document.getElementById("outGroups");
  outGroups.innerHTML = "";
  const groups = meeting.groups || [];
  if (groups.length > 0) {
    const groupTable = document.createElement("table");
    groupTable.className = "output-table";
    const theadG = document.createElement("thead");
    theadG.innerHTML = "<tr><th>分组</th><th>组长</th><th>成员</th></tr>";
    groupTable.appendChild(theadG);
    const tbodyG = document.createElement("tbody");
    groups.forEach((g) => {
      const tr = document.createElement("tr");
      const tdGroup = document.createElement("td");
      tdGroup.textContent = g.name;
      const tdLeader = document.createElement("td");
      if (g.leaderId) {
        const leader = participants.find((p) => p.id === g.leaderId);
        if (leader) tdLeader.appendChild(createPersonChip(leader));
        else tdLeader.textContent = "-";
      } else {
        tdLeader.textContent = "（未指定）";
      }
      const tdMembers = document.createElement("td");
      const memberIds = g.memberIds || [];
      if (memberIds.length === 0) {
        tdMembers.textContent = "（暂无成员）";
      } else {
        memberIds
          .map((pid) => participants.find((p) => p.id === pid))
          .filter(Boolean)
          .forEach((p) => tdMembers.appendChild(createPersonChip(p)));
      }
      tr.appendChild(tdGroup);
      tr.appendChild(tdLeader);
      tr.appendChild(tdMembers);
      tbodyG.appendChild(tr);
    });
    groupTable.appendChild(tbodyG);
    outGroups.appendChild(groupTable);
  }
}
function buildPlainTextForCopy() {
  const meeting = getSelectedMeeting();
  if (!meeting) return "";
  const loc = meeting.location || { address: "" };
  const withTime = computeAgendaTimes(meeting.startTime, meeting.agendaItems || []);
  const typeLabelMap = new Map(AgendaTypeOptions.map((o) => [o.value, o.label]));
  const participants = meeting.participants || [];
  const groups = meeting.groups || [];
  let text = "";
  text += `【会议名称】\n${meeting.name}\n\n`;
  text += "【会议地点】\n";
  text += `地址：${loc.address || "未填写"}\n\n`;
  text += "【会议议程】\n";
  withTime.forEach((item) => {
    const typeLabel = typeLabelMap.get(item.type) || "";
    text += `- ${item.timeText ? "[" + item.timeText + "] " : ""}${typeLabel}｜${
      item.title || ""
    }｜${item.owner || ""}｜${item.durationMinutes || 0} 分钟\n`;
  });
  text += "\n";
  text += "【会议人员】\n";
  const byDept = new Map();
  participants.forEach((p) => {
    const dept = p.dept || "未分配部门";
    if (!byDept.has(dept)) byDept.set(dept, []);
    byDept.get(dept).push(p.name);
  });
  for (const [dept, names] of byDept.entries()) {
    text += `${dept}：${names.join("、")}\n`;
  }
  text += "\n";
  text += "【分组情况】\n";
  groups.forEach((g) => {
    const leader = g.leaderId
      ? participants.find((p) => p.id === g.leaderId)
      : null;
    const memberNames = (g.memberIds || [])
      .map((pid) => participants.find((p) => p.id === pid))
      .filter(Boolean)
      .map((p) => p.name);
    const leaderPart = leader ? `组长：${leader.name}；` : "";
    const membersPart = memberNames.length
      ? `成员：${memberNames.join("、")}`
      : "成员：无";
    text += `${g.name}：${leaderPart}${membersPart}\n`;
  });
  return text;
}
function setupOutputEvents() {
  document.getElementById("btnCopyText").addEventListener("click", async () => {
    const text = buildPlainTextForCopy();
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      alert("已复制到剪贴板。");
    } catch {
      alert("复制失败，可以手动选择文本复制。");
    }
  });
  document.getElementById("btnExportImage").addEventListener("click", () => {
    const card = document.getElementById("outputCard");
    html2canvas(card, { scale: 2, useCORS: true }).then((canvas) => {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "会议信息.png";
      link.textContent = "点击下载生成的会议信息图片";
      link.className = "download-link";
      const container = document.getElementById("downloadArea");
      container.innerHTML = "";
      container.appendChild(link);
    });
  });
}

// 通用初始化
function renderAllSections() {
  renderBoardSection();
  updateCurrentMeetingDisplay();
  renderLocationSection();
  renderAgendaSection();
  renderParticipantsSection();
  renderOutputSection();
}
function setupNavEvents() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => setCurrentSection(btn.dataset.section));
  });
}
function init() {
  loadState();
  document.getElementById("btnAddMeeting").addEventListener("click", handleAddMeeting);
  setupNavEvents();
  setupLocationEvents();
  setupAgendaEvents();
  setupParticipantsEvents();
  setupOutputEvents();
  showSection("board");
  renderAllSections();
}
document.addEventListener("DOMContentLoaded", init);
