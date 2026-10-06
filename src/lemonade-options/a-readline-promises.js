/* Using good object-oriented design principles, implement a lemonade stand simulation.
You should have a class to represent the state of the lemonade stand. The stand should
maintain an inventory, which is updated every time a cup is sold according to a recipe
that is maintained over time.

The simulation should proceed one day at a time. Each day, the player of the game will
be told what the weather is (more lemonade will be sold on hotter days) and the current
prices for supplies (cups, ice, lemons, and sugar). The player should input how much
supplies to buy at the current prices. Then, the simulation should tell the player how
many cups were sold, how many supplies are left, and what the current cash balance is.

You should do some searching to find out how to handle console input in Node.js. This
is an important skill (beyond just using AI and hoping it uses the API correctly).
Read the documentation and make sure you’re doing it right.

Be sure to commit your code each time you add a feature. We expect to see a few different
commits with appropriate comments as you make progress. Do not just undo and then commit
at the end — we will see you’ve done this when we look at your commit log!
*/
import * as readline from 'node:readline/promises'; // 🔴 CHANGE 1: typed ES-module import of the promise-based API (was: const readline = require('readline');)
class Game {
    static MAX_CUPS_WORTH_PER_PURCHASE = 10; // 🔴 CHANGE 2: one named limit instead of a 10 repeated in two places
    today;
    stand;
    maxDays = 10;
    // 🔴 CHANGE 3: one input interface for the whole game (was: a new one created on every question)
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    constructor(maxDays) {
        this.maxDays = maxDays;
        this.today = new Day(1, 'cloudy', 2, 1, 0.75);
        this.stand = new LemonadeStand(100, { lemons: 10, sugar: 10, cups: 10 }, { lemonAmount: 2, sugarAmount: 1, waterAmount: 1, iceAmount: 1 }, 0.5);
    }
    gameIsNotOver() {
        if (this.today.getDay() > this.maxDays) {
            console.log("Game over: Summer break ended and you need to go to school! Learn well.");
            return false;
        }
        if (this.stand.getCashBalance() <= 0) {
            console.log("Game over: Sorry kid, you're broke. Best of luck next time!");
            return false;
        }
        return true;
    }
    // Prints weather and prices
    printDayInfo() {
        console.log(`Day ${this.today.getDay()}: It's ${this.today.getWeather()}.`);
        const costs = this.today.getCosts();
        console.log(`Current prices: Lemons - $${costs.lemonCost}, Sugar - $${costs.sugarCost}, Cups - $${costs.cupCost}, Water and Ice - Always free!`);
        console.log(`Cash balance: $${this.stand.getCashBalance()}`);
        const inventory = this.stand.getInventory();
        console.log(`Inventory: ${inventory.lemons} Lemons, ${inventory.sugar} Sugar, ${inventory.cups} Cups. Water and ice are free.`);
        console.log(`With these supplies, you can make ${this.stand.inventoryToNumberOfLemonadeCups()} number of cups of lemonade.`);
    }
    // Sales proportional to heat
    weatherToSales() {
        const weather = this.today.getWeather();
        switch (weather) {
            case 'hot':
                return 10;
            case 'sunny':
                return 7;
            case 'cloudy':
                return 5;
            case 'rainy':
                return 2;
            case 'snowy':
                return 1;
            default:
                return 0;
        }
    }
    // 🔴 CHANGE 4: now async; it awaits a valid amount instead of handling input inside a callback
    async getUserInputAndBuy(costPerCup) {
        const numberCupsWorthToBuy = await this.askForCupsWorthToBuy();
        const amountBought = this.stand.increaseInventory(numberCupsWorthToBuy, this.today.getCosts());
        console.log(`Successfully purchased ${amountBought} cups worth of supplies; total cost: $${(amountBought * costPerCup).toFixed(2)}.`);
    }
    // 🔴 CHANGE 5: new method. Keeps asking until the player types a whole number in range, then returns it
    async askForCupsWorthToBuy() {
        const max = Game.MAX_CUPS_WORTH_PER_PURCHASE;
        while (true) {
            const answer = await this.rl.question(`Enter the amount (0-${max}) of lemonade cups worth of supplies would you like to purchase? `);
            const amount = Number(answer);
            // handling evil user or buggy user
            const isValid = Number.isInteger(amount) && amount >= 0 && amount <= max; // 🔴 CHANGE 6: isInteger rejects NaN AND decimals (was: isNaN, which let "3.7" through)
            if (isValid) {
                return amount;
            }
            console.log(`Invalid input. Please enter a whole number between 0 and ${max}.`);
        }
    }
    async handlePurchasing() {
        const costPerCup = this.stand.costPerCup(this.today.getCosts());
        this.stand.setSellingPricePerCup(costPerCup * (Math.random() * 2 + 1)); // 🔴 CHANGE 7: parentheses moved so the price is 1x to 3x cost (was: (cost x 0-2) + $1)
        const updatedSellingPricePerCup = this.stand.getSellingPricePerCup();
        console.log(`Given the current costs, the cost for the supplies to make another cup of lemonade is $${costPerCup.toFixed(2)}.`);
        console.log(`Your mom told you to set the selling price per cup today to: $${updatedSellingPricePerCup.toFixed(2)}.`);
        await this.getUserInputAndBuy(costPerCup); // (unchanged line, but it only works now: see CHANGE 4)
    }
    /* shows day number, weather, today's prices, cash, inventory
    asks by how many lemonade cup's worth of supplies to increase the inventory
    tells the stand to buy (stand checks and deducts cash)
    works out demand from weather, then sell min(demand, what user can make)
    shows cups sold, supplies left, cash
    advances to the next day */
    async run() {
        try { // 🔴 CHANGE 8: try/finally so the input interface is always closed when the game ends
            while (this.gameIsNotOver()) {
                this.printDayInfo();
                await this.handlePurchasing();
                let salesDemand = this.weatherToSales();
                let cupsCanMake = this.stand.inventoryToNumberOfLemonadeCups();
                let cupsSold = this.stand.sellLemonade(Math.min(salesDemand, cupsCanMake));
                let profits = cupsSold * this.stand.getSellingPricePerCup();
                console.log(`Number of cups sold: ${cupsSold}`);
                console.log(`Profits: $${profits.toFixed(2)}`); // toFixed(2) because we tend to show just 2 decimal places
                console.log(`Cash balance: $${this.stand.getCashBalance().toFixed(2)}`);
                console.log(`Inventory remaining: ${this.stand.getInventory().lemons} lemons, ${this.stand.getInventory().sugar} sugar, ${this.stand.getInventory().cups} cups`);
                this.today.nextDay();
            }
        }
        finally {
            this.rl.close(); // 🔴 CHANGE 8 (continued): releases stdin, or the program never exits
        }
    }
}
class Day {
    day;
    weather;
    costs;
    WEATHER = ['snowy', 'rainy', 'cloudy', 'sunny', 'hot'];
    constructor(day, weather, costOfLemons, costOfSugar, costOfCups) {
        this.day = day;
        this.weather = weather;
        this.costs = {
            lemonCost: costOfLemons,
            sugarCost: costOfSugar,
            cupCost: costOfCups
        };
    }
    getWeather() {
        return this.weather;
    }
    getDay() {
        return this.day;
    }
    getCosts() {
        return this.costs;
    }
    nextDay() {
        this.day++;
        this.causeRandomWeather();
        this.causeRandomPriceIncrease();
    }
    causeRandomWeather() {
        const randomIndex = Math.floor(Math.random() * this.WEATHER.length);
        const randomWeather = this.WEATHER[randomIndex];
        if (randomWeather === undefined) {
            throw new Error('Weather index out of bounds');
        } // I just put this here to stop the this.weather from being red underlined;
        // This ought never actually be needed, given the set up
        this.weather = randomWeather;
    }
    causeRandomPriceIncrease() {
        const randomIncrease = Math.floor(Math.random() * 3) + 1; // between $1 and $3
        this.costs.lemonCost += randomIncrease;
        this.costs.sugarCost += randomIncrease;
        this.costs.cupCost += randomIncrease;
    }
}
class LemonadeStand {
    cashBalance;
    inventory;
    recipe;
    sellingPricePerCup;
    constructor(cashBalance, inventory, recipe, sellingPricePerCup) {
        this.cashBalance = cashBalance;
        this.inventory = inventory;
        this.recipe = recipe;
        this.sellingPricePerCup = sellingPricePerCup;
    }
    getInventory() {
        return this.inventory;
    }
    getRecipe() {
        return this.recipe;
    }
    getCashBalance() {
        return this.cashBalance;
    }
    getSellingPricePerCup() {
        return this.sellingPricePerCup;
    }
    setSellingPricePerCup(price) {
        this.sellingPricePerCup = price;
    }
    costPerCup(costs) {
        return costs.lemonCost * this.recipe.lemonAmount + costs.sugarCost * this.recipe.sugarAmount + costs.cupCost;
    }
    // Returns number of lemonade cups worth of supplies successfully added to inventory
    increaseInventory(numberOfCupsIncrease, costs) {
        let charge = numberOfCupsIncrease * this.costPerCup(costs);
        ; // ice and water are free
        if (this.cashBalance < charge) {
            let cupsCanBuy = Math.floor((this.cashBalance / charge) * numberOfCupsIncrease);
            return this.increaseInventory(cupsCanBuy, costs);
        }
        this.cashBalance -= charge;
        this.inventory.lemons += numberOfCupsIncrease * this.recipe.lemonAmount;
        this.inventory.sugar += numberOfCupsIncrease * this.recipe.sugarAmount;
        this.inventory.cups += numberOfCupsIncrease * 1;
        return numberOfCupsIncrease;
    }
    // Returns the number of cups actually made
    sellLemonade(cupsSold) {
        let cupsFromInventoryToMake = this.inventoryToNumberOfLemonadeCups();
        // If the user's requested amount exceeds available inventory, makes as many as possible
        if (cupsSold > cupsFromInventoryToMake) {
            return this.sellLemonade(cupsFromInventoryToMake);
        }
        this.inventory.lemons -= this.recipe.lemonAmount * cupsSold;
        this.inventory.sugar -= this.recipe.sugarAmount * cupsSold;
        this.inventory.cups -= 1 * cupsSold;
        return cupsSold;
    }
    // Returns number of cups of lemonade possible to make with current inventory
    inventoryToNumberOfLemonadeCups() {
        // More rigorous inventory check to support if we wanted separate purchasing logic
        // for each ingredient as an extension in the future
        let cupsWorthOfLemon = this.inventory.lemons / this.recipe.lemonAmount;
        let cupsWorthOfSugar = this.inventory.sugar / this.recipe.sugarAmount;
        return Math.min(this.inventory.cups, Math.min(cupsWorthOfLemon, cupsWorthOfSugar));
    }
}
// 🔴 CHANGE 9: entry point. It sits below every class, so Day and LemonadeStand exist when Game uses them
new Game(10).run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
//# sourceMappingURL=a-readline-promises.js.map