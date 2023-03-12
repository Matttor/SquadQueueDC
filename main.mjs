/*
Experimental code for Counting Queue DC events recorded in SquadServer.log by (WTH) Mattt
For use on archived .log only, NOT INTENDED TO BE RUN ON A LIVE SERVER'S .log
This assumes before connection: const qPort = "15000"; see line 80 to alter if required.
Sample console output:
Log 03/04/23 12:41:43
448 Successful Connections from 377 Unique Visitors
542 D/C from Queue Events happened to 429 Unique Visitors
*/
import { readFileSync } from "fs";

//define filepath "C:/Users/user/Desktop/logFolder/SquadGame.log";
const _logPath = "C:/Users/user/Desktop/log/SquadGame.log";

const _log = readFileSync(_logPath).toString().split(/\r?\n/);

class Player {
  constructor(requestedJoin, msgId, snc, steamId, name) {
    this.requestedJoin = requestedJoin;
    this.msgId = msgId;
    this.snc = snc;
    this.steamId = steamId;
    this.name = name;
  }
}

const _clients = {
  connections: [],
  queue: [],
  dcB4Queue: [],
};

const initParse = async (log, clients, regex) => {
  for (const line of log) {
    regexToCompare(line, clients, regex);
  }
  endFunc(clients);
  process.exit(0);
};

const endFunc = (clients) => {
  let connArr = [];
  for (const plyr of clients.connections) {
    connArr.push(plyr.steamId);
  }
  const dcArr = clients.dcB4Queue;
  const totalGoodConnections = connArr.length;
  const totalDCfromQue = dcArr.length;
  const totalGoodConnectionsUnique = [...new Set(connArr)].length;
  const totalUniqueDCfQ = [...new Set(dcArr)].length;
  console.log(`${totalGoodConnections} Successful Connections from ${totalGoodConnectionsUnique} Unique Visitors\n${totalDCfromQue} D/C from Queue Events happened to ${totalUniqueDCfQ} Unique Visitors`);
};

const regexToCompare = (line, clients, regex) => {
  const ind = regex.findIndex((element) => element.regex.test(line));
  if (ind === -1) return;
  const mline = line.match(regex[ind].regex);
  regex[ind].function(mline, clients);
};

const logFileBegin = (line) => {
  console.log(`Log ${line[1]}`);
};

const hasBeenRemoved = (input, clients) => {
  const steamId = input[3];
  const ind = clients.connections.findIndex((plyr) => plyr.steamId === steamId);
  const queInd = clients.queue.findIndex((plyr) => plyr.steamId === steamId);
  if (ind > -1) {
  } else if (queInd > -1) {
    const name = clients.queue[queInd].name;
    if (name === "") {
      clients.dcB4Queue.push(steamId);
    } else {
      // other DC queue state, with name ie possible Autokick?
    }
  }
  clients.queue = clients.queue.filter((plyr) => plyr.steamId !== steamId);
};

const notifyAcceptedConnection = (input, clients) => {
  const qPort = "15000";
  const requestedJoin = input[1];
  const msgId = input[2];
  const steamId = input[5];
  const pId = input[6];
  const snc = input[7];
  const ind = clients.queue.findIndex((plyr) => plyr.steamId === steamId);
  if (ind > -1) {
    clients.queue[ind].snc = input[7];
    return;
  }
  ind = clients.queue.findIndex((plyr) => testTimemsgId(plyr, requestedJoin, msgId));
  if (ind < 0 && pId === qPort) clients.queue.push(new Player(requestedJoin, msgId, snc, steamId, ""));
};

const serverAcceptingPostChallengeConnectionFrom = (input, clients) => {
  const requestedJoin = input[1];
  const msgId = input[2];
  const steamId = input[3];
  const ind = clients.queue.findIndex((plyr) => plyr.steamId === steamId);
  if (ind < 0) clients.queue.push(new Player(requestedJoin, msgId, "", steamId, ""));
  else {
    clients.queue[ind].requestedJoin = requestedJoin;
    clients.queue[ind].msgId = msgId;
  }
};

const logOnlineSTEAMAddinguser = (input, clients) => {
  const requestedJoin = input[1];
  const msgId = input[2];
  const steamId = input[3];
  const ind = clients.queue.findIndex((plyr) => testTimemsgId(plyr, requestedJoin, msgId));
  if (ind < 0) clients.queue.push(new Player(requestedJoin, msgId, "", steamId, ""));
};

const addClientConnectionAddedclientconnection = (input, clients) => {
  const requestedJoin = input[1];
  const msgId = input[2];
  const steamId = input[3];
  const snc = input[5];
  const ind = clients.queue.findIndex((plyr) => plyr.steamId === steamId);
  if (ind < 0) clients.queue.push(new Player(requestedJoin, msgId, "", steamId, ""));
  else {
    if (/^SteamNetConnection_(\d+)$/.test(snc)) {
      clients.queue[ind].snc = snc;
    }
  }
};

const newPlayer = (input, clients) => {
  const requestedJoin = input[1];
  const msgId = input[2];
  let ind = clients.connections.findIndex((plyr) => testTimemsgId(plyr, requestedJoin, msgId));
  if (ind < 0) {
    //debugger;
  }
  if (ind === clients.connections.length - 1) {
    updateConnFilterPre(input, ind, clients);
  } else {
    ind = clients.connections.findIndex((plyr) => testTimemsgId(plyr, requestedJoin, msgId) && plyr.snc === "");
    if (ind < 0) {
      //debugger;
    } else updateConnFilterPre(input, ind, clients);
  }
};

const updateConnFilterPre = (input, ind, clients) => {
  const snc = input[3];
  const indP = clients.queue.findIndex((plyr) => plyr.snc === snc);
  if (indP > -1) {
    if (clients.queue[indP].steamId !== "") {
      clients.connections[ind].steamId = clients.queue[indP].steamId;
    }
  }
  clients.queue = clients.queue.filter((plyr) => plyr.snc !== snc);
};

const testTimemsgId = (plyr, requestedJoin, msgId) => {
  if (plyr.msgId === msgId && timeDiff(Date.parse(convTimeDate(plyr.requestedJoin)), Date.parse(convTimeDate(requestedJoin)), 6, 0)) return true;
  return false;
};

const convTimeDate = (input) => {
  const arr = input.match(/^([0-9]{4}).([0-9]{2}).([0-9]{2})-([0-9]{2}).([0-9]{2}).([0-9]{2}):([0-9]{3})/);
  return `${arr[1]}-${arr[2]}-${arr[3]}T${arr[4]}:${arr[5]}:${arr[6]}.${arr[7]}Z`;
};

const timeDiff = (a, b, thresha, threshb) => {
  if (b - a < thresha && b - a >= threshb) return true;
  return false;
};

const createdSquad = (input, clients) => {
  rareBadJoinSquad(input, clients);
};

const newNameandHex = (input, clients) => {
  const name = input[3];
  const hex = input[4];
  const steamId = BigInt(hex).toString();
  const ind = clients.queue.findIndex((plyr) => plyr.steamId === steamId);
  const indP = clients.connections.findIndex((plyr) => plyr.steamId === steamId);
  if (ind > -1) clients.queue[ind].name = name;
  if (indP > -1) clients.queue.filter((plyr) => plyr.steamId !== steamId);
};

const uNetConnectionClose = (input, clients) => {
  const line = input[0];
  const time = input[1];
  const msgId = input[2];
  const steamId = input[3];
  hasBeenRemoved([line, time, msgId, steamId], clients);
};

const sendingCloseBunch = (input, clients) => {
  const line = input[0];
  const time = input[1];
  const msgId = input[2];
  const steamId = input[3];
  hasBeenRemoved([line, time, msgId, steamId], clients);
};

const sendingCloseBunch_Uid_Invalid = (input, clients) => {
  const line = input[0];
  const time = input[1];
  const msgId = input[2];
  const steamId = input[3];
  hasBeenRemoved([line, time, msgId, steamId], clients);
};

const connectionClosingDuringPendingDestroy = (input, self) => {
  const line = input[0];
  const time = input[1];
  const msgId = input[2];
  const steamId = input[8];
  hasBeenRemoved([line, time, msgId, steamId], self);
};

const logNetJoinRequest = (input, clients) => {
  const time = input[1];
  const msgId = input[2];
  const steamId = input[3];
  clients.connections.push(new Player(time, msgId, "", steamId, ""));
  clients.queue = clients.queue.filter((plyr) => plyr.steamId !== steamId);
};

const rareBadJoin = (input, clients) => {
  const time = input[1];
  const msgId = input[2];
  clients.connections.push(new Player(time, msgId, "", "", ""));
};

const rareBadJoinSquad = (input, clients) => {
  const time = input[1];
  const msgId = input[2];
  const name = input[3];
  const steamId = input[4];
  const ind = clients.connections.findIndex((plyr) => plyr.steamId === steamId);
  if (ind > -1) return;
  else clients.connections.push(new Player(time, msgId, "", steamId, name));
  clients.queue = clients.queue.filter((plyr) => plyr.steamId !== steamId);
};

const _regex = [
  {
    regex: /^\[([0-9.:-]+)]\[([ 0-9]+)]LogSquad: Login: NewPlayer: SteamNetConnection \/Engine\/Transient\.([A-z0-9]+)/,
    function: newPlayer,
  },
  {
    regex: /^\[([0-9.:-]+)]\[([ 0-9]+)]LogNet: UNetConnection::Close: \[UNetConnection] RemoteAddr: ([0-9]{17}):([0-9]+), Name: ([A-z_0-9]+), Driver: GameNetDriver ([A-z_0-9]+), IsServer: YES, PC: ([A-z_0-9]+), Owner: ([A-z_0-9]+), UniqueId: Steam:(.+), Channels: ([0-9]+), Time: ([0-9.-]+)/,
    function: uNetConnectionClose,
  },
  {
    regex: /^\[([0-9.:-]+)]\[([ 0-9]+)]LogNet: NotifyAcceptedConnection: Name: ([A-z_0-9-]+), TimeStamp: ([0-9/ :]+), \[UNetConnection] RemoteAddr: ([0-9]{17}):([0-9]+), Name: ([A-z_0-9]+)/,
    function: notifyAcceptedConnection,
  },
  {
    regex: /^\[([0-9.:-]+)]\[([ 0-9]+)]LogNet: Server accepting post-challenge connection from: ([0-9]+)\:([0-9]+)/,
    function: serverAcceptingPostChallengeConnectionFrom,
  },
  {
    regex: /^\[([0-9.:-]+)]\[([ 0-9]+)]LogOnline: STEAM: Adding user ([0-9]{17}):([0-9]+) from RegisterConnection/,
    function: logOnlineSTEAMAddinguser,
  },
  {
    regex: /^\[([0-9.:-]+)]\[([ 0-9]+)]LogNet: AddClientConnection: Added client connection: \[UNetConnection] RemoteAddr: ([0-9]{17}):([0-9]+), Name: ([A-z_0-9]+), Driver: ([A-z_0-9]+) ([A-z_0-9]+), IsServer: ([A-z]+), PC: ([A-z]+), Owner: ([A-z]+), UniqueId: (.+)/,
    function: addClientConnectionAddedclientconnection,
  },
  {
    regex: /^\[([0-9.:-]+)]\[([ 0-9]+)]LogOnline: STEAM: ([0-9]{17}) has been removed./,
    function: hasBeenRemoved,
  },
  {
    regex: /^\[([0-9.:-]+)]\[([ 0-9]+)]LogNet: UChannel::Close: Sending CloseBunch. ChIndex == (?:\d). Name: \[UChannel] ChIndex: (?:\d), Closing: (?:\d) \[UNetConnection] RemoteAddr: ([0-9]{17}):([0-9]{4}), Name: (SteamNetConnection_[0-9]{10}), Driver: GameNetDriver (SteamNetDriver_[0-9]{10}), IsServer: YES, PC: (BP_PlayerController_C_[0-9]{10}|NULL), Owner: (BP_PlayerController_C_[0-9]{10}|NULL), UniqueId: Steam:UNKNOWN \[(0x[0-9A-f]{15})]/,
    function: sendingCloseBunch,
  },
  {
    regex: /^\[([0-9.:-]+)]\[([ 0-9]+)]LogNet: UChannel::Close: Sending CloseBunch. ChIndex == (?:\d). Name: \[UChannel] ChIndex: (?:\d), Closing: (?:\d) \[UNetConnection] RemoteAddr: ([0-9]{17}):([0-9]{4,5}), Name: (SteamNetConnection_[0-9]{10}), Driver: (SteamNetDriver_[0-9]{10}|GameNetDriver) (?:SteamNetDriver_[0-9]{10}), IsServer: YES, PC: NULL, Owner: NULL, UniqueId: INVALID/,
    function: sendingCloseBunch_Uid_Invalid,
  },
  {
    regex: /^\[([0-9.:-]+)]\[([ 0-9]+)]LogNet: (?:Warning: UNetConnection::Tick: Connection closing during pending destroy, not all shutdown traffic may have been negotiated|NetworkFailure: ConnectionTimeout, Error: 'UNetConnection::Tick: Connection TIMED OUT. Closing connection.). Elapsed: (.+), Real: (.+), Good: (.+), DriverTime: (.+), Threshold: (.+), \[UNetConnection] RemoteAddr: ([0-9]{17}):([0-9]+), Name: (.+), Driver: GameNetDriver (.+), IsServer: YES, PC: (.+), Owner: (.+), UniqueId: Steam:UNKNOWN \[(.+)]/,
    function: connectionClosingDuringPendingDestroy,
  },
  {
    regex: /^\[([0-9.:-]+)]\[([ 0-9]+)]LogNet: Join request: \/Game\/Maps\/(?:EntryMap|Logar_Valley\/LogarValley_AAS_v1)\?Name=\?SplitscreenCount=(\d)(.+)/,
    function: rareBadJoin,
  },
  {
    regex: /^\[([0-9.:-]+)]\[([ 0-9]+)]LogNet: Join request: \/Game\/Maps\/(?:EntryMap|Logar_Valley\/LogarValley_AAS_v1)\?Name=(.+)\?SplitscreenCount=(\d)/,
    function: logNetJoinRequest,
  },
  {
    regex: /^\[([0-9.:-]+)]\[([ 0-9]+)]LogSquad: (.+) \(Steam ID: ([0-9]{17})\) has created Squad ([0-9]+) \(Squad Name: (.+)\) on (.+)/,
    function: createdSquad,
  },
  {
    regex: /^\[([0-9.:-]+)]\[([ 0-9]+)]LogNet: Login request: \?Name=(.+) userId: Steam:UNKNOWN \[(0x[0-9A-f]{15})] platform: (.+)/,
    function: newNameandHex,
  },
  {
    regex: /Log file open, ([0-9/ :]+)/,
    function: logFileBegin,
  },
];

initParse(_log, _clients, _regex);
