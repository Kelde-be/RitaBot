// -----------------
// Global variables
// -----------------

// codebeat:disable[LOC,ABC,BLOCK_NESTING,ARITY]
const autoTranslate = require("./auto");
const Sequelize = require("sequelize");
const logger = require("./logger");
const Op = Sequelize.Op;

// ----------------------
// Database Auth Process
// ----------------------

const db = process.env.DATABASE_URL.endsWith(".db") ?
   new Sequelize({
      dialect: "sqlite",
      dialectOptions: {
         ssl: {
            require: true,
            rejectUnauthorized: false
         }
      },
      storage: process.env.DATABASE_URL
   }) :
   new Sequelize(process.env.DATABASE_URL, {
      logging: console.log,
      dialectOptions: {
         ssl: {
            require: true,
            rejectUnauthorized: false
         }
      }
      //logging: null,
   });

db
   .authenticate()
   .then(() =>
   {
      logger("dev","Successfully connected to database");
   })
   .catch(err =>
   {
      logger("error", err);
   });

// ---------------------------------
// Database server table definition
// ---------------------------------

const Servers = db.define("servers", {
   id: {
      type: Sequelize.STRING(32),
      primaryKey: true,
      unique: true,
      allowNull: false
   },
   lang: {
      type: Sequelize.STRING(8),
      defaultValue: "en"
   },
   count: {
      type: Sequelize.INTEGER,
      defaultValue: 0
   },
   active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
   },
   embedstyle: {
      type: Sequelize.STRING(8),
      defaultValue: "on"
   },
   bot2botstyle: {
      type: Sequelize.STRING(8),
      defaultValue: "off"
   },
   webhookid: Sequelize.STRING(32),
   webhooktoken: Sequelize.STRING(255),
   webhookactive: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
   }
});

// --------------------------------
// Database tasks table definition
// --------------------------------

const Tasks = db.define("tasks", {
   origin: Sequelize.STRING(32),
   dest: Sequelize.STRING(32),
   reply: Sequelize.STRING(32),
   server: Sequelize.STRING(32),
   active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
   },
   LangTo: {
      type: Sequelize.STRING(8),
      defaultValue: "en"
   },
   LangFrom: {
      type: Sequelize.STRING(8),
      defaultValue: "en"
   }
},
{
   indexes: [
      {
         unique: true,
         name: "ux_index_1",
         fields: ["origin", "dest", "LangTo", "LangFrom"]
      }
   ]
});

// -------------------
// Init/create tables
// -------------------

exports.initializeDatabase = async function(client)
{
   db.sync({ logging: console.log }).then(async() =>
   {
      Servers.upsert({ id: "bot",
         lang: "en" });
      exports.updateColumns();
      db.getQueryInterface().removeIndex("tasks", "tasks_origin_dest");
      const guilds = client.guilds.array().length;
      const guildsArray = client.guilds.array();
      var i;
      for (i = 0; i < guilds; i++)
      {
         const guild = guildsArray[i];
         const guildID = guild.id;
         Servers.findAll({ where: { id: guildID } }).then(projects =>
         {
            if (projects.length === 0)
            {
               Servers.upsert({ id: guildID,
                  lang: "en" });
            }
         });
      }
      console.log("----------------------------------------\nDatabase fully initialized.\n----------------------------------------");
   });
};
// -----------------------
// Add Server to Database
// -----------------------

exports.addServer = function(id, lang)
{
   return Servers.create({
      id: id,
      lang: lang
   });
};

// ------------------
// Deactivate Server
// ------------------

exports.removeServer = function(id)
{
   return Servers.update({ active: false }, { where: { id: id } });
};

// -------------------
// Update Server Lang
// -------------------

exports.updateServerLang = function(id, lang, _cb)
{
   return Servers.update({ lang: lang }, { where: { id: id } }).then(
      function ()
      {
         _cb();
      });
};

// -------------------------------
// Update Embedded Variable in DB
// -------------------------------
var embedstyleVar ="";
exports.updateEmbedVar = function(id, embedstyle, _cb)
{
   embedstyleVar = embedstyle;
   return Servers.update({ embedstyle: embedstyle }, { where: { id: id } }).then(
      function ()
      {
         _cb();
      });
};

// ------------------------------
// Update Bot2Bot Variable In DB
// ------------------------------
var dbBot2BotValue ="";
exports.updateBot2BotVar = function(id, bot2botstyle, _cb)
{
   dbBot2BotValue = bot2botstyle;
   return Servers.update({ bot2botstyle: bot2botstyle }, { where: { id: id } }).then(
      function ()
      {
         _cb();
      });
};

// -----------------------------------------------
// Update webhookID & webhookToken Variable In DB
// -----------------------------------------------
var dbWebhookIDValue ="";
var dbWebhookTokenValue ="";
exports.updateWebhookVar = function(id, webhookid, webhooktoken, webhookactive, _cb)
{
   dbWebhookIDValue = webhookid;
   dbWebhookTokenValue = webhooktoken;
   return Servers.update({ webhookid: webhookid,
      webhooktoken: webhooktoken,
      webhookactive: webhookactive }, { where: { id: id } }).then(
      function ()
      {
         _cb();
      });
};

// -------------------
// Deactivate Webhook
// -------------------

exports.removeWebhook = function(id, _cb)
{
   return Servers.update({ webhookactive: false }, { where: { id: id } }).then(
      function ()
      {
         _cb();
      });
};

// -----------------------------
// Add Missing Variable Columns
// -----------------------------

exports.updateColumns = function(data)
{
   // Very sloppy code, neew to find a better fix.
   db.getQueryInterface().describeTable("servers").then(tableDefinition =>
   {
      if (!tableDefinition.embedstyle)
      {
         console.log("-------------> Adding embedstyle column");
         db.getQueryInterface().addColumn("servers", "embedstyle", {
            type: Sequelize.STRING(8),
            defaultValue: "on"});
      }
      if (!tableDefinition.bot2botstyle)
      {
         console.log("-------------> Adding bot2botstyle column");
         db.getQueryInterface().addColumn("servers", "bot2botstyle", {
            type: Sequelize.STRING(8),
            defaultValue: "off"});
      }
      if (!tableDefinition.webhookid)
      {
         console.log("-------------> Adding webhookid column");
         db.getQueryInterface().addColumn("servers", "webhookid", {
            type: Sequelize.STRING(32)});
      }
      if (!tableDefinition.webhooktoken)
      {
         console.log("-------------> Adding webhooktoken column");
         db.getQueryInterface().addColumn("servers", "webhooktoken", {
            type: Sequelize.STRING(255)});
      }
      if (!tableDefinition.webhookactive)
      {
         console.log("-------------> Adding webhookactive column");
         db.getQueryInterface().addColumn("servers", "webhookactive", {
            type: Sequelize.BOOLEAN,
            defaultValue: false});
      }
   });
};

// ------------------
// Get Channel Tasks
// ------------------

exports.channelTasks = function(data)
{
   var id = data.message.channel.id;
   if (data.message.channel.type === "dm")
   {
      id = "@" + data.message.author.id;
   }
   try
   {
      const taskList = Tasks.findAll({ where: { origin: id,
         active: true }}).then(
         function (result)
         {
            data.rows = result;
            return autoTranslate(data);
         });
   }
   catch (e)
   {
      logger("error", e);
      data.err = e;
      return autoTranslate(data);
   }
};
// ------------------------------
// Get tasks for channel or user
// ------------------------------

exports.getTasks = function(origin, dest, cb)
{
   if (dest === "me")
   {
      return Tasks.findAll({ where: { origin: origin,
         dest: dest } }, {raw: true}).then(
         function (result, err)
         {
            cb(err, result);
         });
   }
   return Tasks.findAll({ where: { origin: origin } }, {raw: true}).then(
      function (result, err)
      {
         cb(err, result);
      });
};

// --------------------------------
// Check if dest is found in tasks
// --------------------------------

exports.checkTask = function(origin, dest, cb)
{
   if (dest === "all")
   {
      return Tasks.findAll({ where: { origin: origin } }, {raw: true}).then(
         function (result, err)
         {
            cb(err, result);
         });
   }
   return Tasks.findAll({ where: { origin: origin,
      dest: dest } }, {raw: true}).then(
      function (result, err)
      {
         cb(err, result);
      });
};

// --------------------
// Remove Channel Task
// --------------------

exports.removeTask = function(origin, dest, cb)
{
   console.log("removeTask()");
   if (dest === "all")
   {
      console.log("removeTask() - all");
      return Tasks.destroy({ where: { [Op.or]: [{ origin: origin },{ dest: origin }] } }).then(
         function (err, result)
         {
            cb(null, result);
         });
   }
   return Tasks.destroy({ where: { [Op.or]: [{ origin: origin,
      dest: dest },{ origin: dest,
      dest: origin }] } }).then(
      function (err, result)
      {
         cb(null, result);
      });
};

// ---------------
// Get Task Count
// ---------------

exports.getTasksCount = function(origin, cb)
{
   return Tasks.count({ where: {"origin": origin }}).then(c =>
   {
      cb("", c);
   });
};

// ------------------
// Get Servers Count
// ------------------

exports.getServersCount = function(cb)
{
   return Servers.count().then(c =>
   {
      cb("", c);
   });
};

// ---------
// Add Task
// ---------

exports.addTask = function(task)
{
   task.dest.forEach(dest =>
   {
      Tasks.upsert({
         origin: task.origin,
         dest: dest,
         reply: task.reply,
         server: task.server,
         active: true,
         LangTo: task.to,
         LangFrom: task.from
      }).then(() =>
      {
         logger("dev", "Task added successfully.");
      })
         .catch(err =>
         {
            logger("error", err);
         });
   });
};

// ------------
// Update stat
// ------------

exports.increaseServers = function(id)
{
   return Servers.increment("count", { where: { id: id }});
};

// --------------
// Get bot stats
// --------------

exports.getStats = function(callback)
{
   return db.query(`select * from (select sum(count) as "totalCount", ` +
  `count(id)-1 as "totalServers" from servers) as table1, ` +
  `(select count(id)-1 as "activeSrv" from servers where active = TRUE) as table2, ` +
  `(select lang as "botLang" from servers where id = 'bot') as table3, ` +
  `(select count(distinct origin) as "activeTasks" ` +
  `from tasks where active = TRUE) as table4, ` +
  `(select count(distinct origin) as "activeUserTasks" ` +
  `from tasks where active = TRUE and origin like '@%') as table5;`, { type: Sequelize.QueryTypes.SELECT})
      .then(
         result => callback(result),
         err => logger("error", err + "\nQuery: " + err.sql, "db")
      );
};

// ----------------
// Get server info
// ----------------

exports.getServerInfo = function(id, callback)
{
   return db.query(`select * from (select count as "count",` +
   `lang as "lang" from servers where id = ?) as table1,` +
   `(select count(distinct origin) as "activeTasks"` +
   `from tasks where server = ?) as table2,` +
   `(select count(distinct origin) as "activeUserTasks"` +
   `from tasks where origin like '@%' and server = ?) as table3, ` +
   `(select embedstyle as "embedstyle" from servers where id = ?) as table4, ` +
   `(select bot2botstyle as "bot2botstyle" from servers where id = ?) as table5, ` +
   `(select webhookactive as "webhookactive" from servers where id = ?) as table6,` +
   `(select webhookid as "webhookid" from servers where id = ?) as table7,` +
   `(select webhooktoken as "webhooktoken" from servers where id = ?) as table8;`, { replacements: [ id, id, id, id, id, id, id, id],
      type: db.QueryTypes.SELECT})
      .then(
         result => callback(result),
         err => this.updateColumns() //+ logger("error", err + "\nQuery: " + err.sql, "db")
      );
};

// ---------
// Close DB
// ---------

exports.close = function()
{
   return db.close();
};