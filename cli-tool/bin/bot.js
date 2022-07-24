#!/usr/bin/env node

import chalk from 'chalk';
import gradient from 'gradient-string';
import inquirer from 'inquirer';
import chalkAnimation from 'chalk-animation';
import figlet from 'figlet';
import { createSpinner } from 'nanospinner';
import fs from 'fs';
import mineflayer from 'mineflayer';
var bot = null;
var t = null, n = null, reconnect_function = null, check_for_staff_function = null;
var last_command = null;
var afk_grind = false;
let session_time = 0;
let session_xp = 0;
let login_xp = 0;
var uptime_run = "";
let autoclickerHasStopped = false;
var fromUser = false;
import { once } from 'events';
import { default as pItem } from 'prismarine-item'

//npm install --save mineflayer-autoclicker
// minecflayer-autoclicker
import { default as autoclicker } from 'mineflayer-autoclicker'

// Create sleep timer
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

async function setup(){
    console.clear();

    const rainbowTitle = chalkAnimation.rainbow(
        'MADE BY SH1TTERS \n'
    );

    await sleep(2000);
    // Create a spinner that says "Loading..."
    const spinner = createSpinner('Loading tool...');
    spinner.start();

    // Load config file
    await loadConfig();
    
    spinner.stop();
    rainbowTitle.stop();

    await main();
}

await setup();

// Create main function
async function main() {
    console.clear();

    console.log(`
    ${chalk.yellow(figlet.textSync('SH1TTERS', { horizontalLayout: 'full' }))}
    `)

    console.log(`
    [0] Start Bot
    [1] Configure Bot
    [2] Exit\n\n`);
    
    const answer = await inquirer.prompt({
        name: 'module',
        type: 'input',
        message: 'Select a module:',
        default(){
            return '[<module_id>]'
        },
    });

    if(answer.module == 0){
        console.log(`\n${chalk.yellow('Starting bot...')}`);
        await createBot();

    } else if(answer.module == 1){
        console.log(`\n${chalk.yellow('Configuring bot...')}`);
        await sleep(2000);
        console.log(`\n${chalk.green('Bot configured!')}`);
    } else if(answer.module == 2){
        console.log(`\n${chalk.yellow('Exiting...')}`);
        await sleep(2000);
        console.log(`\n${chalk.green('Exited!')}`);
    }

}

async function createBot(){
    console.log(`${chalk.yellow('Setting up credentials...')}`);	

    // Read config.json file
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

    // Using the data from config.json file, create a new mineflayer bot with username, password and auth
    bot = await mineflayer.createBot({
        host: config['essentials']['server_ip'], // minecraft server ip
        username: config.accounts[0].username, // minecraft username
        password: config.accounts[0].password, // minecraft password, comment out if you want to log into online-mode=false servers
        version: config['essentials']['server_version'], // minecraft version
        auth: config.accounts[0].auth
    });

    // Create mineflayer bot login handler
    bot.on('login', async () => {
        await sleep(1000);
        console.log(`\n${chalk.green('Bot logged in!')}`);

        bot.loadPlugin(autoclicker);

        // Clear console
        console.clear();

        // Read config.json file
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

        // Check if auto message is enabled, and if so, then get the message content
        if(config['essentials']['auto_message'].enabled == true){
            const message = config['essentials']['auto_message'].message;
            bot.chat(`${message}`);
            last_command = `${message}`;
        }

        // Check first if the bot previously was logged in, then we want to log it back in and start grinding again until the bots coordinates is the same as the ones stored
        if(config['classified']['dwakdiawd__**^*¨324324sjawdi::dw23'].enabled == true){
            console.log("Checking if bot coordinates is matching...");
            reconnect_function = setInterval(awaitCoordinatesMatch, 5000);
        } else {
            // We just want to run this if the bot was not logged in before.
            t = setInterval(updateConsole, 1000);
            await sleep(5000);
        }
});

// Create mineflayer bot chat handler
bot.on('chat', async (username, message) => {

    // Read config.json file
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

    // Check if the username matches the owner username from config.json file
    if(username == config['essentials']['owner_username']){
        clearInterval(t);
        if(message.includes("hey man")){
            afk_grind = false;
            bot.autoclicker.stop()
            bot.chat(`/tpa ${username}`);
            last_command = `/tpa ${username}`;
            t = setInterval(updateConsole, 1000);
        }
        else
        if(message.includes("u there?")){
            bot.chat(`/msg ${username} yes bro`);
            last_command = `/msg ${username} yes bro`;
            t = setInterval(updateConsole, 1000);
        }
        else
        if(message.includes("can u grind?")){
            afk_grind = true;
            session_time = 0;
            login_xp = bot.experience.points;
            session_xp = 0;
            last_command = `Turn on AFK Grind`;
            grindMode();
            t = setInterval(updateConsole, 1000);
        }
        else
        if(message.includes("can u stop grinding?")){
            afk_grind = false;
            last_command = `Turn off AFK Grind`
            bot.autoclicker.stop()
            t = setInterval(updateConsole, 1000);
        }
        else
        if(message.includes("clean inventory")){
            await performTossInventory();
            last_command = `Clean inventory`;
        }
        else
        if(message.includes("do:")){
            let doCMD = message.split(":")[1];
            bot.chat(`${doCMD}`);
            last_command = doCMD;
            t = setInterval(updateConsole, 1000);
        }
        else
        if(message.includes("bot.end")){
            bot.end();
        }
    }
    });

    // Create mineflayer bot kick handler
    bot.on('kicked', async (reason, loggedIn) => {
        // Stop updating console
        clearInterval(t);
        /*
        Emitted when the bot is kicked from the server. reason is a chat message explaining why you were kicked. 
        loggedIn is true if the client was kicked after successfully logging in, 
        or false if the kick occurred in the login phase.
        */

        // Read config.json file
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

        console.log(`\n${chalk.red('Bot kicked!')}`);
        console.log(`${chalk.red('Reason:')} ${reason}`);
        console.log('\n');
        await sleep(3000);

        // Check if 'auto-reconnect' in config.json file is set to true
        if(config['essentials']['auto_reconnect'] == true){

            // Was the bot logged in before?
            if(loggedIn){
                console.log(`${chalk.red('Bot was logged in before being kicked!')}`);
                await sleep(2000);

                // Try to login again
                console.log(`${chalk.yellow('Trying to login again...')}`);
                reconnectToServer();
            } else {
                console.log(`${chalk.red('The error occured while in the login phase (Never actually joined the server...)')}`);
            }
        }
    });

    // Create mineflayer bot end handler
    bot.on('end', async (reason) => {
        // Stop updating console
        clearInterval(t);
        clearInterval(reconnect_function);
        // Stop checking for staff
        clearInterval(check_for_staff_function);
        check_for_staff_function = null;
        t = null;
        /*
        Emitted when the bot is disconnected from the server.
            */
        console.log(`\n${chalk.red('Bot disconnected!')}`);
        console.log(`${chalk.red('Reason:')} ${reason}`);
        await sleep(5000);

        // Read config.json file
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

        // Check if 'auto-reconnect' in config.json file is set to true
        if(config['essentials']['auto_reconnect'] == true){

            // Try to login again
            console.log(`${chalk.yellow('Trying to login again...')}`);
            reconnectToServer();
        }
    });

    // Create mineflayer bot scoreboard updated handler
    bot.on('scoreUpdated', async (scoreboard) => {
        /**
         * Check if the bot is in the lobby by checking the scoreboard items
         */
    });

    // Create mineflayer bot windowOpen handler
    bot.on('windowOpen', async (window) => {
        // Check if bot is not afk grinding, then just return.
        if(afk_grind != true) return;

        // Stop updating console
        clearInterval(t);
        t = null;

        // Stop checking for anti staff
        clearInterval(check_for_staff_function);
        check_for_staff_function = null;

        // Stop the auto clicker
        bot.autoclicker.stop();

        // Read config.json file
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        // Check if 'anti-afk-bypasser' in config.json file is true
        if(config['essentials']['anti-afk-bypasser'] == true){
        
            if(window.title == "Anti AFK Grinding Verification"){
                window.close();

                // Start the auto clicker
                bot.autoclicker.start();

                // Start updating console
                t = setInterval(updateConsole, 1000);

                // Start checking for anti staff
                check_for_staff_function = setInterval(antiStaffChecker, 2500);
            }
        }
    });
}

async function awaitCoordinatesMatch(){
    // Read config.json file
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

    //config['classified']['dwakdiawd__**^*¨324324sjawdi::dw23']['.-d*^*2314dwadwa'].x
    if(bot.entity.position.x == config['classified']['dwakdiawd__**^*¨324324sjawdi::dw23']['.-d*^*2314dwadwa'].x && bot.entity.position.y == config['classified']['dwakdiawd__**^*¨324324sjawdi::dw23']['.-d*^*2314dwadwa'].y && bot.entity.position.z == config['classified']['dwakdiawd__**^*¨324324sjawdi::dw23']['.-d*^*2314dwadwa'].z){

        console.log(`${chalk.green('Bot coordinates match!')}`);
        clearInterval(reconnect_function);
        reconnect_function = null;

        await sleep(1000);

        if(afk_grind){
            attackModeConfiguration();
            bot.autoclicker.start();
        }

        // Read config.json file
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

        // Change "dwakdiawd__**^*¨324324sjawdi::dw23" inside "classified" value from false to true
        config['classified']['dwakdiawd__**^*¨324324sjawdi::dw23'].enabled = false;

        // Write config.json file
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

        // Start updating console (afk_grind is already true, if the bot was afk grinding when it got disconnected, so it will automatically start grinding again)
        t = setInterval(updateConsole, 1000);
    }
}

async function antiStaffChecker(){
    /*
    If the bots position changes when afk_grind is true, then the bot will automatically stop grinding.
    */

    // Read config.json file
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

    if(afk_grind == true){
        // Have we been moved by staff maybe?
        if(bot.entity.position.x != config['classified']['dwakdiawd__**^*¨324324sjawdi::dw23']['.-d*^*2314dwadwa'].x && bot.entity.position.y != config['classified']['dwakdiawd__**^*¨324324sjawdi::dw23']['.-d*^*2314dwadwa'].y && bot.entity.position.z != config['classified']['dwakdiawd__**^*¨324324sjawdi::dw23']['.-d*^*2314dwadwa'].z){

            // Wait 1 sec for some human reactions
            await sleep(1000);

            console.log(`${chalk.red('Bot position changed!')}`);
            afk_grind = false;
            bot.autoclicker.stop();

            // Stop updating console
            clearInterval(t);
            t = null;

            // Stop checking for staff
            clearInterval(check_for_staff_function);
            check_for_staff_function = null;

            bot.chat("yooo wtf, someone just tpd me to a different location!");
            await sleep(1000);
            bot.chat("im going to spawn!");
            bot.chat("/spawn");
        }
    }
}

async function reconnectToServer(){
    // Read config.json file
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

    // Change "dwakdiawd__**^*¨324324sjawdi::dw23" inside "classified" value from false to true
    config['classified']['dwakdiawd__**^*¨324324sjawdi::dw23'].enabled = true;

    // Write config.json file
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

    // Create new bot
    createBot();
}

async function grindMode(){
    attackModeConfiguration();
    bot.autoclicker.start();
    CountUpTimer();

    // Save x,y,z to classified config.json file
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

    // Change ".-d*^*2314dwadwa" inside "dwakdiawd__**^*¨324324sjawdi::dw23" value to bot.spawnPoint value
    config['classified']['dwakdiawd__**^*¨324324sjawdi::dw23']['.-d*^*2314dwadwa'] = bot.entity.position;

    // Write config.json file
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

    // Check for anti staff bypasser
    check_for_staff_function = setInterval(antiStaffChecker, 2500);
}

async function updateConsole(){
    console.clear(); //node . 3>&1 > output.txt
    // Read config.json file
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

    // Calculate session xp
    session_xp = bot.experience.points - login_xp;

    // Console log the bot's ingame username, server ip and tps
    console.log(`${chalk.yellow('Username: ')}${chalk.green(bot.username)}`);
    console.log(`${chalk.yellow('Current Coordinates: ')}${chalk.greenBright(bot.entity.position)}`);
    console.log(`${chalk.yellow('Ping: ')}${chalk.greenBright(bot.player.ping)}`);
    console.log(`${chalk.yellow('Server: ')}${chalk.greenBright(config['essentials']['server_ip'])}`);
    console.log(`${chalk.yellow('Current XP: ')}${chalk.greenBright(bot.experience.points)}`);
    if(last_command != null){
        console.log(`${chalk.yellow('Last command execution: ')}${chalk.greenBright(last_command)}`);
    }
    console.log(`\n`);
    console.log(`${chalk.yellow('AFK Grind: ')}${chalk.greenBright(afk_grind)}`);
    if(afk_grind){
        console.log(`${chalk.yellow('Session time: ')}${chalk.greenBright(uptime_run)}`); 
        console.log(`${chalk.yellow('Session XP Earned: ')}${chalk.greenBright(session_xp)}`); 

        if(Object.values(bot.entities).filter(entities => entities.mobType == "Blaze").length == 0){ 
            // No blazes detected!!
            console.log(`${chalk.red('No Blazes Found (Stopping autoclicker)')}`);
            console.log(`${chalk.red('Waiting for mobType: \'Blaze\' to spawn...')}`);

            // Stop the autoclicker
            bot.autoclicker.stop();

            // Set autoclickerHasStopped to true
            autoclickerHasStopped = true;
        } else {

            if(autoclickerHasStopped) {
                
                // wait 5 seconds
                await sleep(5000);

                // Start the autoclicker
                bot.autoclicker.start();

                // Reset the autoclickerHasStopped variable
                autoclickerHasStopped = false;
            }
        }

    }
}

async function attackModeConfiguration(){
    bot.autoclicker.options = {
        max_distance: 1.5, // Max distance to hit entities (Default: 3.5)
        blacklist: ['player'], // Do not hit certain entities (Default: ['player'])
        stop_on_window: false, // Stop if a window is opened (Default: true)
        always_swing: true, // Always swing, even if there is no entity (Default: true)
        delay: 500, // Delay between each swing (Default: 2000)
    }
}

async function CountUpTimer(){
    while(afk_grind){
        session_time++;

        // Calculate time into seconds, minutes and hours
        let seconds = session_time % 60;
        let minutes = Math.floor(session_time / 60) % 60;
        let hours = Math.floor(session_time / 3600);

        // Return the values
        uptime_run = `${hours} hours, ${minutes} minutes, ${seconds} seconds`;
        await sleep(1000);
    }
}

async function performTossInventory(){
    const itemsQueue = bot.inventory.items().filter(item => !!item);
    if(itemsQueue.length === 0){
        console.log(`${chalk.yellow('Inventory is empty!')}`);
        t = setInterval(updateConsole, 1000);
        return;
    }
    const item = itemsQueue.pop();
    console.log(`Trying to toss: ${item.name} with ${itemsQueue.length} items left`)
    tossStack_v1_8_9(bot, item);
    
    setTimeout(performTossInventory, 1000);
}


async function loadConfig(){
    // Read the account.txt file in input folder and split into array by ":"
    const accounts = fs.readFileSync('./input/account.txt', 'utf8').split(':');

    // Read config.json file
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

    // Create a new json array and add the previous details to it
    config.accounts = [];
    config.accounts.push({
        username: accounts[0],
        password: accounts[1],
        auth: accounts[2]
    });

    // Save the json array to config.json array
    fs.writeFileSync('./config.json', JSON.stringify(config));
    
    console.log(`\n\n${chalk.green('Config loaded')}`);
}


// put this at the top level or smth
let actionId = 10000
function newActionId() {
  actionId = actionId === 32767 ? 10000 : actionId + 1
  return actionId
}

async function tossStack_v1_8_9 (bot, item) {

  // if you click on the quick bar and have dug recently,
  // wait a bit
  if (item.slot >= bot.QUICK_BAR_START && bot.lastDigTime != null) {
    let timeSinceLastDig
    while ((timeSinceLastDig = new Date() - bot.lastDigTime) < DIG_CLICK_TIMEOUT) {
      await sleep(DIG_CLICK_TIMEOUT - timeSinceLastDig)
    }
  }

  // get new unique action Id
  const actionId = newActionId();

  const window = bot.currentWindow || bot.inventory
  const Item = pItem(bot.version)
  // send request to drop item
  bot._client.write('window_click', {
    windowId: window.id,
    slot: item.slot,
    mouseButton: 1,
    action: actionId,
    mode: 4,
    item: Item.toNotch(item)
  })
  
  // wait for response
  const [success] = await once(bot, `confirmTransaction${actionId}`)
  
  // fail if declined
  if (!success) {
    throw new Error(`Server rejected transaction for clicking on slot ${item.slot}, on window with id ${window?.id}.`)
  }

  // remove from inventory
  window.updateSlot(item.slot, null)
}
