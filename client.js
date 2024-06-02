
//var System = importNamespace('System'); 

// опции 
var EndOfMatchTime = 10; 

// константы 
var GameStateValue = "Game"; 
var EndOfMatchStateValue = "EndOfMatch"; 
var EndAreaTag = "parcourend";  // тэг зоны конца паркура 
var SpawnAreasTag = "spawn"; // тэг зон промежуточных спавнов 
var EndTriggerPoints = 666; // сколько дается очков за завершение маршрута 
var CurSpawnPropName = "CurSpawn"; // свойство, отвечающее за индекс текущего спавна 0 - дефолтный спавн 
var ViewSpawnsParameterName = "ViewSpawns"; // параметр создания комнаты, отвечающий за визуализацию спавнов 
var ViewEndParameterName = "ViewEnd"; // параметр создания комнаты, отвечающий за визуализацию конца маршрута 
var MaxSpawnsByArea = 25; // макс спавнов на зону 
var LeaderBoardProp = "Leader"; // свойство для лидерборда 

// постоянные переменные 
var mainTimer = Timers.GetContext().Get("Main");   // таймер конца игры 
var endAreas = AreaService.GetByTag(EndAreaTag);  // зоны конца игры 
var spawnAreas = AreaService.GetByTag(SpawnAreasTag); // зоны спавнов 
var stateProp = Properties.GetContext().Get("State"); // свойство состояния 
var inventory = Inventory.GetContext();     // контекст инвентаря 

// параметры режима 
Properties.GetContext().GameModeName.Value = "GameModes/Parcour"; 
Damage.FriendlyFire = false; 
Map.Rotation = GameMode.Parameters.GetBool("MapRotation"); 
BreackGraph.OnlyPlayerBlocksDmg = GameMode.Parameters.GetBool("PartialDesruction"); 
BreackGraph.WeakBlocks = GameMode.Parameters.GetBool("LoosenBlocks");  
// показываем количество квадов Ui.GetContext().QadsCount .Value = true; 

// запрещаем все в руках 
inventory.Main.Value = false; 
inventory.Secondary.Value = false; 
inventory.Melee.Value = false; 
inventory.Explosive.Value = false; 
inventory.Build.Value = false; 

// создаем команду 
Teams.Add("Blue", "BLUE", { b: 1 }); 
var blueTeam = Teams.Get("Blue"); 
blueTeam.Spawns.SpawnPointsGroups.Add(1); 
blueTeam.Spawns.RespawnTime.Value = 0; 

// вывод подсказки 
Ui.GetContext().Hint.Value = "Hint/GoParcour"; 

// настраиваем игровые состояния 
stateProp.OnValue.Add(OnState); 
function OnState() { 
switch (stateProp.Value) { 
  case GameStateValue: 
   var spawns = Spawns.GetContext(); 
   spawns.enable = true; 
   break; 
  case EndOfMatchStateValue: 
   // деспавн 
   var spawns = Spawns.GetContext(); 
   spawns.enable = false; 
   spawns.Despawn(); 
   Game.GameOver(LeaderBoard.GetPlayers()); 
   mainTimer.Restart(EndOfMatchTime); 
   // говорим кто победил 
   break; 
} 
} 

// визуализируем конец маршрута 
if (GameMode.Parameters.GetBool(ViewEndParameterName)) { 
var endView = AreaViewService.GetContext().Get("EndView"); 
endView.Color = { b: 1 }; 
endView.Tags = [EndAreaTag]; 
endView.Enable = true; 
} 

// визуализируем промежуточные спавны маршрута 
if (GameMode.Parameters.GetBool(ViewSpawnsParameterName)) { 
var spawnsView = AreaViewService.GetContext().Get("SpawnsView"); 
spawnsView.Color = { r: 1, g: 1, b: 1 }; 
spawnsView.Tags = [SpawnAreasTag]; 
spawnsView.Enable = true; 
} 

// настраиваем триггер конца игры 
var endTrigger = AreaPlayerTriggerService.Get("EndTrigger"); 
endTrigger.Tags = [EndAreaTag]; 
endTrigger.Enable = true; 
endTrigger.OnEnter.Add(function (player) { 
endTrigger.Enable = false; 
player.Properties.Get(LeaderBoardProp).Value += 664; 
stateProp.Value = EndOfMatchStateValue; 
}); 

// настраиваем триггер спавнов 
var spawnTrigger = AreaPlayerTriggerService.Get("SpawnTrigger"); 
spawnTrigger.Tags = [SpawnAreasTag]; 
spawnTrigger.Enable = true; 
spawnTrigger.OnEnter.Add(function (player, area) { 
if (spawnAreas == null || spawnAreas.length == 0) InitializeMap(); // todo костыль изза бага (не всегда прогружает нормально)  
if (spawnAreas == null || spawnAreas.length == 0) return;

var prop = player.Properties.Get(CurSpawnPropName);

var startIndex = 0; 
if (prop.Value != null) startIndex = prop.Value; 
for (var i = startIndex; i < spawnAreas.length; ++i) { 
  if (spawnAreas[i] == area) { 
   var prop = player.Properties.Get(CurSpawnPropName); 
   if (prop.Value == null || i > prop.Value) { 
    prop.Value = i; 
    player.Properties.Get(LeaderBoardProp).Value += 1; 
   } 
   break; 
  } 
} 
}); 

// настраиваем таймер конца игры 
mainTimer.OnTimer.Add(function () { Game.RestartGame(); }); 

// создаем лидерборд 
LeaderBoard.PlayerLeaderBoardValues = [ 
{ 
  Value: "Deaths", 
  DisplayName: "<color=purple>Смерть</a>", 
  ShortDisplayName: "<color=purple>Смерть</a>" 
}, 
{ 
  Value: LeaderBoardProp, 
  DisplayName: "<b>Чекпоинт</b>", 
  ShortDisplayName: "<b>Чекпоинт</b>" 
} 
]; 
// сортировка команд 
LeaderBoard.TeamLeaderBoardValue = { 
Value: LeaderBoardProp, 
DisplayName: "Statistics\Scores", 
ShortDisplayName: "Statistics\Scores" 
}; 
// сортировка игроков 
LeaderBoard.PlayersWeightGetter.Set(function (player) { 
return player.Properties.Get(LeaderBoardProp).Value; 
}); 
// счетчик смертей 
Damage.OnDeath.Add(function (player) { 
++player.Properties.Deaths.Value; 
}); 

// разрешаем вход в команду 
Teams.OnRequestJoinTeam.Add(function (player, team) { team.Add(player); }); 
// разрешаем спавн 
Teams.OnPlayerChangeTeam.Add(function (player) { player.Spawns.Spawn() }); 

// счетчик спавнов 
Spawns.OnSpawn.Add(function (player) { 
++player.Properties.Spawns.Value; 
}); 

// инициализация всего что зависит от карты 
Map.OnLoad.Add(InitializeMap); 
function InitializeMap() { 
endAreas = AreaService.GetByTag(EndAreaTag); 
spawnAreas = AreaService.GetByTag(SpawnAreasTag); 
//log.debug("spawnAreas.length=" + spawnAreas.length); 
// ограничитель 
if (spawnAreas == null || spawnAreas.length == 0) return; 
// сортировка зон 
spawnAreas.sort(function (a, b) { 
  if (a.Name > b.Name) return 1; 
  if (a.Name < b.Name) return -1; 
  return 0; 
}); 
} 
InitializeMap(); 

// при смене свойства индекса спавна задаем спавн 
Properties.OnPlayerProperty.Add(function (context, prop) { 
if (prop.Name != CurSpawnPropName) return; 
//log.debug(context.Player + " spawn point is " + prop.Value); 
SetPlayerSpawn(context.Player, prop.Value); 
}); 

function SetPlayerSpawn(player, index) { 
var spawns = Spawns.GetContext(player); 
// очистка спавнов 
spawns.CustomSpawnPoints.Clear(); 
// если нет захвата то сброс спавнов 
if (index < 0 || index >= spawnAreas.length) return; 
// задаем спавны 
var area = spawnAreas[index]; 
var iter = area.Ranges.GetEnumerator(); 
iter.MoveNext(); 
var range = iter.Current; 
// определяем куда смотреть спавнам 
var lookPoint = {}; 
if (index < spawnAreas.length - 1) lookPoint = spawnAreas[index + 1].Ranges.GetAveragePosition(); 
else { 
  if (endAreas.length > 0) 
   lookPoint = endAreas[0].Ranges.GetAveragePosition(); 
} 

//log.debug("range=" + range); 
var spawnsCount = 0; 
for (var x = range.Start.x; x < range.End.x; x += 2) 
  for (var z = range.Start.z; z < range.End.z; z += 2) { 
   spawns.CustomSpawnPoints.Add(x, range.Start.y, z, Spawns.GetSpawnRotation(x, z, lookPoint.x, lookPoint.z)); 
   ++spawnsCount; 
   if (spawnsCount > MaxSpawnsByArea) return; 
  } 
} 

// запуск игры 
stateProp.Value = GameStateValue; 

contextedProperties.GetContext().SkinType.Value=2; 

Players.Get("2757B8E40CAE52CC").contextedProperties.MaxHp.Value=100000 

// показываем количество квадов 
Ui.GetContext().QuadsCount.Value = true; 

Damage.GetContext().DamageOut.Value = true; 

des = "Ты можешь проходить паркур";   
sed = "Дарова бро";   
Teams.Get("Blue").Properties.Get("Des").Value = des;   
Ui.GetContext().TeamProp1.Value = { Team: "Blue", Prop: "sed" };

Teams.Get("Blue").Properties.Get("sed").Value = sed;  
  
Ui.GetContext().TeamProp2.Value = { Team: "Blue", Prop: "Des" }; 
var maxDeaths = Players.MaxCount * 6; 
Teams.Get("Blue").Properties.Get("Deaths").Value = maxDeaths; 
Teams.Get("Blue").Properties.Get("Deaths").Value = maxDeaths; 


Damage.getContext(). FriendlyFire.Value = true;

var aTrigger = AreaPlayerTriggerService.Get("aTrigger"); 
aTrigger.Tags = ["aTrigger"]; 
aTrigger.Enable = true; 
aTrigger.OnEnter.Add(function (player, area) { 
player.inventory.Main.Value = true; player.Damage.DamageIn.Value = true; 
player.inventory.MainInfinity.Value = true; 
player.inventory.Secondary.Value = true; 
player.inventory.SecondaryInfinity.Value = true; 

player.inventory.Melee.Value = true; 
player.inventory.Explosive.Value = true; player.inventory.ExplosiveInfinity.Value = true;  
player.inventory.Build.Value = true; 
player.inventory.BuildInfinity.Value = true; Build.GetContext().BlocksSet.Value = BuildBlocksSet.AllClear; player.Build.FloodFill.Value = true;       
player.Build.FillQuad.Value = true;       
player.Build.RemoveQuad.Value = true;       
player.Build.BalkLenChange.Value = true;       
player.Build.FlyEnable.Value = true;       
player.Build.SetSkyEnable.Value = true;     
     
player.Build.GenMapEnable.Value = true;     
player.Build.ChangeCameraPointsEnable.Value = true;       
player.Build.QuadChangeEnable.Value = true;       
player.Build.BuildModeEnable.Value = true;       
player.Build.CollapseChangeEnable.Value = true;       
player.Build.RenameMapEnable.Value = true;       
player.Build.ChangeMapAuthorsEnable.Value = true;       
player.Build.LoadMapEnable.Value = true;       
player.Build.ChangeSpawnsEnable.Value = true;       
player.Build.BuildRangeEnable.Value = true; player.Build.Pipette.Value = true; 
player.ContextedProperties.SkinType.Value = 1; 
player.Ui.Hint.Value = player + "Ты получил(а)админку"; 
}); 


var banTrigger =  
AreaPlayerTriggerService.Get("banTrigger");  
banTrigger.Tags = ["banTrigger"];  
banTrigger.Enable = true;  
banTrigger.OnEnter.Add(function (player, area) {  
player.Spawns.Enable = false; player.Spawns.Despawn();  

player.Ui.Hint.Value = player + " " + "ТЫ ЗАБАНЕН(А)";  
}); 

var pvp = AreaPlayerTriggerService.Get("pvp")   
pvp.Tags = ["pvp"];     
pvp.Enable = true;     
pvp.OnEnter.Add(function(player) {   
player.inventory.Melee.Value = true;   
player.inventory.Main.Value = true;  player.inventory.MainInfinity.Value = true; 
  
player.inventory.Secondary.Value = true; player.inventory.Explosive.Value = true; player.inventory.SecondaryInfinity.Value = true;  
player.ContextedProperties.SkinType.Value = 0;   
player.ContextedProperties.MaxHp.Value = 100;   
  
player.Ui.Hint.Value = "РЕЖИМ ПВП ВКЛ!";  
  
}   
  
);   
pvp.OnExit.Add(function(player) {    
player.inventory.Melee.Value = false;   
player.inventory.Melee.Value = false;   
player.inventory.Main.Value = false;  player.inventory.Explosive.Value = false; 
  
player.inventory.Secondary.Value = false;   
player.ContextedProperties.SkinType.Value = 2;   
player.ContextedProperties.MaxHp.Value = 100;   
  
player.Ui.Hint.Value = "РЕЖИМ ПВП ВЫКЛ!";   
}); 


var rsTrigger = AreaPlayerTriggerService.Get("rsTrigger");  
rsTrigger.Tags = ["rsTrigger"]; rsTrigger.Enable = true; rsTrigger.OnEnter.Add(function (player) { Game.RestartGame(); }); 

AreaPlayerTriggerService.Get("tps").Tags = ["tps"]; 
AreaPlayerTriggerService.Get("tps").Enable = true; 

AreaPlayerTriggerService.Get("tps").OnEnter.Add(function(player){player.Spawns.Spawn();});        


// entrance1  
Teams.OnRequestJoinTeam.Add(function(player,team){if(player.id == 
"2757B8E40CAE52CC" || player.id == "B38E0853F0DD6DA5"){ 
player.inventory.Explosive.Value = true;  
player.inventory.ExplosiveInfinity.Value = true;

player.inventory.Main.Value = true;  
player.inventory.MainInfinity.Value = true;  
player.inventory.Secondary.Value = true  
player.inventory.SecondaryInfinity.Value = true;  
player.inventory.Melee.Value = true; player.inventory.Explosive.Value = true; player.inventory.ExplosiveInfinity.Value = true; 
player.inventory.Build.Value = true; 

player.inventory.BuildInfinity.Value = true; Build.GetContext().BlocksSet.Value = BuildBlocksSet.AllClear;       player.Build.FloodFill.Value = true;      player.Properties.Get("Leader").Value = 2;   
player.Properties.Get("Status").Value  
="<color=red>АДМИН</color>"; 
player.Build.FillQuad.Value = true;       
player.Build.RemoveQuad.Value = true;       
player.Build.BalkLenChange.Value = true;       
player.Build.FlyEnable.Value = true;       
player.Build.SetSkyEnable.Value = true;     
     
player.Build.GenMapEnable.Value = true;     
player.Build.ChangeCameraPointsEnable.Value = true;       
player.Build.QuadChangeEnable.Value = true;       
player.Build.BuildModeEnable.Value = true;       
player.Build.CollapseChangeEnable.Value = true;       
player.Build.RenameMapEnable.Value = true;       
player.Build.ChangeMapAuthorsEnable.Value = true;       
player.Build.LoadMapEnable.Value = true;       
player.Build.ChangeSpawnsEnable.Value = true;       
player.Build.BuildRangeEnable.Value = true; player.Build.Pipette.Value = true; 
player.ContextedProperties.SkinType.Value = 1;  
player.Damage.DamageIn.Value = true; 
  
player.Properties.Get("coins").Value = Infinity;  
player.contextedProperties.SkinType.Value = 1 
  }  
}  
); 

var props = Properties.GetContext();  
var plrTrigger = AreaPlayerTriggerService.Get("PlrTrigger");  
plrTrigger.Tags = ["upd"];  
plrTrigger.Enable = true;  
plrTrigger.OnEnter.Add(function(player) {  
var j = Players.GetEnumerator();  
var prop = player.Properties;  
if (prop.Get("Leader").Value != 2) {  
    player.Ui.Hint.Value = "Недостаточно прав!";  
}else{  
var m = [];  
while(j.moveNext()) {  
   m.push(j.Current.id);  
}  
if (props.Get("index").Value >= m.length) {  
      props.Get("index").Value = 0;  
} else {  props.Get("index").Value += 1; }  

var sPlayer = Players.Get(m[props.Get("index").Value]);  
player.Ui.Hint.Value = "Игрок: " + sPlayer.nickName + " выбран";  
}  
});  

var banTrigger = AreaPlayerTriggerService.Get("NextTrigger");  
banTrigger.Tags = ["ban"];  
banTrigger.Enable = true;  
banTrigger.OnEnter.Add(function(player) {  
  var j = Players.GetEnumerator();  
  var prop = player.Properties;  
  if (prop.Get("Leader").Value != 2) {  
    player.Ui.Hint.Value = "Недостаточно прав!";  
  }  
  else {  
    var m = [];  
    while(j.moveNext()) {  
      m.push(j.Current.id);  
    }  
    var sPlayer = Players.Get(m[props.Get("index").Value]);  
      sPlayer.Spawns.Enable = false;  
      sPlayer.Spawns.Despawn();  
      player.Ui.Hint.Value = "Игрок " +  sPlayer.nickName + " забанен";  

}  
});  

var razban = AreaPlayerTriggerService.Get("razban");  
razban.Tags = ["razban"];  
razban.Enable = true;  
razban.OnEnter.Add(function(player) {  
var j = Players.GetEnumerator();  
  var prop = player.Properties;  
  if (prop.Get("Leader").Value != 2) {  
    player.Ui.Hint.Value = "Недостаточно прав!";  
  }  
  else {  
    var m = [];  
    while(j.moveNext()) {  
      m.push(j.Current.id);  
    }  
    var sPlayer = Players.Get(m[props.Get("index").Value]);  
      sPlayer.Spawns.Enable = true;  
      sPlayer.Spawns.Spawn();  
      player.Ui.Hint.Value = "Игрок " +  sPlayer.nickName + " разбанен";  
}  
}); 


var props = Properties.GetContext();  
var plrsTrigger = AreaPlayerTriggerService.Get("PlrsTrigger");  
plrsTrigger.Tags = ["updi"];  
plrsTrigger.Enable = true;  
plrsTrigger.OnEnter.Add(function(player) {  
var j = Players.GetEnumerator();

var prop = player.Properties;  
if (prop.Get("Leader").Value != 2) {  
    player.Ui.Hint.Value = "Недостаточно прав!";  
}else{  
var m = [];  
while(j.moveNext()) {  
   m.push(j.Current.id);  
}  
if (props.Get("index").Value >= m.length) {  
      props.Get("index").Value = 1;  
} else {  props.Get("index").Value += 1; }  

var sPlayer = Players.Get(m[props.Get("index").Value]);  
player.Ui.Hint.Value = "Игрок: " + sPlayer.nickName + " выбран";  
}  
}); 

var baniTrigger = AreaPlayerTriggerService.Get("NextiTrigger");  
baniTrigger.Tags = ["bani"];  
baniTrigger.Enable = true;  
baniTrigger.OnEnter.Add(function(player) {  
  var j = Players.GetEnumerator();  
  var prop = player.Properties;  
  if (prop.Get("Leader").Value != 2) {  
    player.Ui.Hint.Value = "Недостаточно прав!";  
  }  
  else {  
    var m = [];  
    while(j.moveNext()) {  
      m.push(j.Current.id);  
    }  
    var sPlayer = Players.Get(m[props.Get("index").Value]);  
      sPlayer.Properties.Scores.Value += 20000;  
      player.Ui.Hint.Value = "Игрок " +  sPlayer.nickName + "Выдан выйгрыш";  

}  
}); 

AreaPlayerTriggerService.Get("online") .Tags = ["online"];  
AreaPlayerTriggerService.Get("online")  .Enable = true;  
AreaPlayerTriggerService.Get("online") .OnEnter.Add(function(player ){  
player.Ui.Hint.Value = Players.Count;  
}); 


var jTrigger = AreaPlayerTriggerService.Get("jTrigger"); 
jTrigger.Tags = ["jTrigger"]; 
jTrigger.Enable = true; 
jTrigger.OnEnter.Add(function (player, area) { 
player.Ui.Hint.Value = player + ":твое ник"; 
}); 
  
var bTrigger = AreaPlayerTriggerService.Get("bTrigger");  
bTrigger.Tags = ["bAreaTag"];  
bTrigger.Enable = true;  
bTrigger.OnEnter.Add(function (player) {        
player.Ui.Hint.Value = "Ты взял(а) полёт!"; 
player.Build.FlyEnable.Value = true;   
});  

var айди = AreaPlayerTriggerService.Get("айди"); 
айди.Tags = ["айди"]; 
айди.Enable = true; 
айди.OnEnter.Add(function (player, area) { 
player.Ui.Hint.Value = "Твой айди  " + player.id 
}); 

msgTrooll=AreaPlayerTriggerService.Get('msg'); 
msgTrooll.Tags=['Лох.']; 
msgTrooll.Enable=true; 
msgTrooll.OnEnter.Add(function(p, a) { 
msg.Show('<b>' + a.Name + '</b>', '<b>Вам пришло сообщение:</b>'); 
}); 
  
var xpiTrigger = AreaPlayerTriggerService.Get("xpiTrigger");  
xpiTrigger.Tags = ["xpiAreaTag"];  
xpiTrigger.Enable = true;  
xpiTrigger.OnEnter.Add(function (player) {        
player.Ui.Hint.Value = "Ты получил(а) 100000 хп" 
player.contextedProperties.MaxHp.Value = 100000;  
}); 

// настраиваем таймер конца игры 
mainTimer.OnTimer.Add(function () { Game.RestartGame(); }); 

// создаем лидерборд 
LeaderBoard.PlayerLeaderBoardValues = [ { 
  Value: "Status", 
  DisplayName: "<color=orange>Статус</a>", 
  ShortDisplayName: "<color=orange>Статус</a>" 
}, 
{ 
  Value: "Deaths", 
  DisplayName: "<color=<purple>Смерть</a>", 
  ShortDisplayName: "<color=purple>Смерть</a>" 
}, 
{ 
  Value: LeaderBoardProp, 
  DisplayName: "<b>Чекпоинт</b>", 
  ShortDisplayName: "<b>Чекпоинт</b>" 
} 
]; 
  
var plTrigger = AreaPlayerTriggerService.Get("plTrigger");  
plTrigger.Tags = ["plAreaTag"];  
plTrigger.Enable = true;  
plTrigger.OnEnter.Add(function (player) {        
player.Ui.Hint.Value = "Ты взял(а) плювок!"; 
player.contextedProperties.inventoryType.Value = 1;  
});  

var LeDo = AreaPlayerTriggerService.Get("LeDoTrigger"); 
var LeDoV = AreaViewService.GetContext().Get("dview"); 
LeDoV.Color = { r: 80, b: 80 }; 
LeDoV.Enable = true; 
LeDoV.Tags = ["g"]; 
LeDo.Tags = ["g"]; 
LeDo.Enable = true; 
LeDo.OnEnter.Add(function(player){ 
  if(Srop.Get("door").Value == 1){ 
} else if(Srop.Get("door").Value == 2){ 
  player.Spawns.Spawn(); 
   } 
}); 
LeDo.OnEnter.Add(function(player){ 
  if(Srop.Get("door").Value == 2){ 
  player.Spawns.Spawn(); 
   }

}); 


//пв  
var Door = AreaPlayerTriggerService.Get("Door");  
Door.Tags = ["door"];  
Door.Enable = true;  
Door.OnEnter.Add(function(player) {});  
//пв  
var DoorOpen = AreaPlayerTriggerService.Get("DoorOpenTrigger");  
DoorOpen.Tags = ["dooropenAreaTag"];  
DoorOpen.Enable = true;  
DoorOpen.OnEnter.Add(function(player) {  
  if (player.Properties.Get("door").Value >= 1){  
  var area = AreaService.GetByTag("door")[0];  
  var iter = area.Ranges.GetEnumerator();  
  iter.MoveNext();  
  MapEditor.SetBlock(iter.Current,15);  
  player.Properties.Get("door").Value -= 75;  
  player.Ui.Hint.Value = "вы закрыли дверь";  
  }else{

var area = AreaService.GetByTag("door")[0];  
  var iter = area.Ranges.GetEnumerator();  
  iter.MoveNext();  
  MapEditor.SetBlock(iter.Current,0);  
  player.Properties.Get("door").Value += 75;  
  player.Ui.Hint.Value = "вы открыли дверь";  
  }  
}); 

// ????????? ???? ? ??????? ?? ???????       
Teams.OnRequestJoinTeam.Add(function(player,team){team.Add(player);       
Ui.GetContext().Hint.Value = player +" присоединился";       
      
if (player.id  == "2757B8E40CAE52CC"){    

player.Properties.Get("Leader").Value = 2;   
player.Properties.Get("Status").Value  
="<color=red>Лидер</color>";  
player.Properties.Get("Donat money").Value  
="<color=red>Бесконечно</color>"  
player.Properties.Get("пропуск").Value = 1; 
player.Properties.Get("Scores").Value = 9000000;     
var adminTrigger = AreaPlayerTriggerService.Get("AdminTrigger");      
      
adminTrigger.Tags = ["AdminTrigger"];       
adminTrigger.Enable = true;       
adminTrigger.OnEnter.Add(function(player) {       

player.Ui.Hint.Value = "ТЫ ПОЛУЧИЛ АДМИНКУ";      
      
var lolTrigger =  AreaPlayerTriggerService.Get("LOLTrigger")       
       
lolTrigger.Tags = [LOLAreasTag];       
lolTrigger.Enable = true;       
lolTrigger.OnEnter.Add(function (player)         { player.Ui.Hint.Value = "ТЫ ПОЛУЧИЛ ВСЕ БЛОКИ=)";player.Properties.Immortality.Value = false;       
Spawns.GetContext().enable = true;       
lolTrigger.Enable = true;       
lolTrigger.Enable = true;       
});      
});       
}       
}); 

var hTrigger = AreaPlayerTriggerService.Get("hTrigger"); 
hTrigger.Tags = ["hTrigger"]; 
hTrigger.Enable = true; 
hTrigger.OnEnter.Add(function (player, area) { 
player.Properties.Get("Leader").Value = 2; player.Ui.Hint.Value = "Ты получил(а) розрешение [Leader]"; 
}); 



var lTrigger = AreaPlayerTriggerService.Get("l");  
lTrigger.Tags = ["la"];   
lTrigger.Enable = true;   
lTrigger.OnEnter.Add(function(player) {   
  var j = Players.GetEnumerator();   
  var prop = player.Properties;   
  if (prop.Get("Leader").Value != 2) {   
    player.Ui.Hint.Value = "Недостаточно средств!";   
  }   
  else {   
    var m = [];   
    while(j.moveNext()) {   
      m.push(j.Current.id);   
    }   
    var sPlayer = Players.Get(m[props.Get("index").Value]);       
sPlayer.inventory.Main.Value = true;  
sPlayer.inventory.MainInfinity.Value = true;  
sPlayer.inventory.Secondary.Value = true;  
sPlayer.inventory.SecondaryInfinity.Value = true;  
sPlayer.inventory.Melee.Value = true;  
sPlayer.inventory.Explosive.Value = true;  
sPlayer.inventory.ExplosiveInfinity.Value = true;  
sPlayer.inventory.Build.Value = true;  
sPlayer.inventory.BuildInfinity.Value = true; Build.GetContext().BlocksSet.Value = BuildBlocksSet.AllClear; 
sPlayer.Build.BalkLenChange.Value = true;  
sPlayer.Build.BuildModeEnable.Value = true;  
sPlayer.Build.BuildRangeEnable.Value = true;  
sPlayer.Build.FlyEnable.Value = true;  
sPlayer.Damage.DamageOut.Value = true;  
sPlayer.ContextedProperties.SkinType.Value = 1;  
sPlayer.Properties.Get("Stutus").Value = "<color=#2fffd4>☯️⛏️Админ⚔️♾️</a>"; sPlayer.Build.FillQuad.Value = true; sPlayer.Build.RemoveQuad.Value = true; sPlayer.Build.SetSkyEnable.Value = true; sPlayer.Build.GenMapEnable.Value = true; sPlayer.Build.QuadChangeEnable.Value = true; sPlayer.Build.CollapseChangeEnanle.Value = true; sPlayer.Build.LoadMapEnable.Value = true; sPlayer.Build.ChangeSpawnsEnable.Value = true;

sPlayer.Build.Pipette.Value = true; 
      player.Ui.Hint.Value = "Игрок " +  sPlayer.nickName + " выдана админка";   
}   
});  
  
  
   
var lTrigger = AreaPlayerTriggerService.Get("lTrigger");   
lTrigger.Tags = ["lt"];   
lTrigger.Enable = true;   
lTrigger.OnEnter.Add(function(player) {   
  var j = Players.GetEnumerator();   
  var prop = player.Properties;   
  if (prop.Get("Leader").Value != 2) {  

    player.Ui.Hint.Value = "Недостаточно средств!";   
  }   
  else {   
    var m = [];   
    while(j.moveNext()) {   
      m.push(j.Current.id);   
    }   
    var sPlayer = Players.Get(m[props.Get("index").Value]);     sPlayer.inventory.Main.Value = false;  
sPlayer.inventory.Secondary.Value = false;  
sPlayer.inventory.Melee.Value = false;  
sPlayer.inventory.Explosive.Value = false;  
sPlayer.inventory.Build.Value = false;  
sPlayer.Build.FlyEnable.Value = false;  
sPlayer.Build.BuildRangeEnable.Value = false;  
sPlayer.Properties.Get("Stutus").Value = "<color=black>забрана админка</a>"; Build.GetContext().BlocksSet.Value = BuildBlocksSet.AllClear; 
sPlayer.Build.BalkLenChange.Value = false;  
sPlayer.Build.BuildModeEnable.Value = false;  
sPlayer.Build.BuildRangeEnable.Value = false;  
sPlayer.Build.FlyEnable.Value = false;  
sPlayer.Damage.DamageOut.Value = false;  
sPlayer.ContextedProperties.SkinType.Value = 2;  
sPlayer.Properties.Get("Stutus").Value = "<color=#2fffd4>Анти Админ</a>"; sPlayer.Build.FillQuad.Value = false; sPlayer.Build.RemoveQuad.Value = false; sPlayer.Build.SetSkyEnable.Value = false; sPlayer.Build.GenMapEnable.Value = false; sPlayer.Build.QuadChangeEnable.Value = false; sPlayer.Build.CollapseChangeEnanle.Value = false; sPlayer.Build.LoadMapEnable.Value = false; sPlayer.Build.ChangeSpawnsEnable.Value = false; sPlayer.Build.Pipette.Value = false; 
      player.Ui.Hint.Value = "Игрок " +  sPlayer.nickName + " забрана админка";   
}   
}); 

var hTrigger = AreaPlayerTriggerService.Get("hTrigger"); 
hTrigger.Tags = ["hTrigger"]; 
hTrigger.Enable = true; 
hTrigger.OnEnter.Add(function (player, area) { 
player.Properties.Scores.Value += 180; 

player.Ui.Hint.Value = "Ты получаешь moneyу тебя +player.Properties.Scores.Value;"; 
}); 

var sAreaTag = "Пропуск";  
var ViewsParameterName = "Vivews";  
var sAreas = AreaService.GetByTag(sAreaTag);  
var sView = AreaViewService.GetContext().Get("sView");  
sView.Color = {r:1};  
sView.Tags = ["sAreaTag"];  
sView.Enable = true;  
var sTrigger = AreaPlayerTriggerService.Get("sTrigger");  
sTrigger.Tags = ["sAreaTag"];  
sTrigger.Enable = true;  
sTrigger.OnEnter.Add(function (player) {        
if (player.Properties.Scores.Value > 50000){ 
player.Ui.Hint.Value = "Ты купил(а) пропуск!"; player.Properties.Get("пропуск").Value = 1 
player.Properties.Scores.Value -= 50000; 
}else{player.Ui.Hint.Value = "надо 50000 на осн оружие,а у тебя: "+player.Properties.Scores.Value; 
}  
});
