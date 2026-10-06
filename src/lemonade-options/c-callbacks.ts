// Version C: callbacks only, no async/await.
// There is no while loop. Each day ends by starting the next day from inside the
// input callback, so a new day can only begin after the player has answered.

import * as readline from 'node:readline'; // 🔴 FIX: a typed import (require() made rl `any`, so tsc couldn't check it)

class Game {
    private static readonly MAX_CUPS_WORTH_PER_PURCHASE = 10;

    private today : Day;
    private stand: LemonadeStand;
    private maxDays: number = 10;
    // One input interface for the whole game: created once here, closed when the game ends
    private rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    constructor(maxDays: number) {
        this.maxDays = maxDays;
        this.today = new Day(1, 'cloudy', 2, 1, 0.75);
        this.stand = new LemonadeStand(100, { lemons: 10, sugar: 10, cups: 10 }, { lemonAmount: 2, sugarAmount: 1, waterAmount: 1, iceAmount: 1 }, 0.5);
    }

    gameIsNotOver() {
        if (this.today.getDay() > this.maxDays) {
            console.log("Game over: Summer break ended and you need to go to school! Learn well.");
            return false;
        }
        if(this.stand.getCashBalance() <= 0) {
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

    // Asks for an amount and buys it, then calls onDone. On invalid input it asks again,
    // and that new call is the one responsible for calling onDone.
    getUserInputAndBuy(costPerCup: number, onDone: () => void) {
        const max = Game.MAX_CUPS_WORTH_PER_PURCHASE;
        this.rl.question(`Enter the amount (0-${max}) of lemonade cups worth of supplies would you like to purchase? `, (cupsWorthToBuy) => {
            const numberCupsWorthToBuy = Number(cupsWorthToBuy);

            // handling evil user or buggy user
            const isValid = Number.isInteger(numberCupsWorthToBuy) && numberCupsWorthToBuy >= 0 && numberCupsWorthToBuy <= max; // 🔴 FIX: isInteger also rejects NaN and decimals like "3.7"
            if (!isValid) {
                console.log(`Invalid input. Please enter a whole number between 0 and ${max}.`);
                this.getUserInputAndBuy(costPerCup, onDone);
                return; // 🔴 FIX: without this, the invalid amount fell through and was bought anyway
            }

            const amountBought = this.stand.increaseInventory(numberCupsWorthToBuy, this.today.getCosts());
            console.log(`Successfully purchased ${amountBought} cups worth of supplies; total cost: $${(amountBought * costPerCup).toFixed(2)}.`);
            onDone();
        });
    }

    handlePurchasing(onDone: () => void) {
        const costPerCup = this.stand.costPerCup(this.today.getCosts());
        this.stand.setSellingPricePerCup(costPerCup * (Math.random() * 2 + 1)); // 🔴 FIX: parentheses, so the price is 1x to 3x cost (was cost * 0-2, plus $1)
        const updatedSellingPricePerCup = this.stand.getSellingPricePerCup();

        console.log(`Given the current costs, the cost for the supplies to make another cup of lemonade is $${costPerCup.toFixed(2)}.`);
        console.log(`Your mom told you to set the selling price per cup today to: $${updatedSellingPricePerCup.toFixed(2)}.`);
        
        this.getUserInputAndBuy(costPerCup, onDone);
    }

    // The rest of the day, after purchasing: sell, report, and advance the date
    sellAndReport() {
        let salesDemand = this.weatherToSales();
        let cupsCanMake = this.stand.inventoryToNumberOfLemonadeCups();
        let cupsSold = this.stand.sellLemonade(Math.min(salesDemand, cupsCanMake));
        let profits = cupsSold * this.stand.getSellingPricePerCup();
        console.log(`Number of cups sold: ${cupsSold}`);
        console.log(`Profits: $${profits.toFixed(2)}`);  // toFixed(2) because we tend to show just 2 decimal places
        console.log(`Cash balance: $${this.stand.getCashBalance().toFixed(2)}`);
        console.log(`Inventory remaining: ${this.stand.getInventory().lemons} lemons, ${this.stand.getInventory().sugar} sugar, ${this.stand.getInventory().cups} cups`);
        this.today.nextDay();
    }

    /* Plays one day. Instead of looping, it passes "finish today, then play the next day"
    as the callback for purchasing, so the next day can only start after the player answers. */
    run() {
        if (!this.gameIsNotOver()) {
            this.rl.close(); // 🔴 FIX: release stdin, or the program never exits
            return;
        }
        this.printDayInfo();
        this.handlePurchasing(() => {
            this.sellAndReport();
            this.run();
        });
    }
}


class Day {
    private day: number;
    private weather: string;
    private costs :{ lemonCost: number; sugarCost: number; cupCost: number };
    private WEATHER : string[] = ['snowy', 'rainy', 'cloudy', 'sunny', 'hot'];

    constructor(day: number, weather: string, costOfLemons: number, costOfSugar: number, costOfCups: number) {
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
    private cashBalance: number;
    private inventory: {lemons: number; sugar: number; cups: number};
    private recipe: {lemonAmount: number, sugarAmount: number, waterAmount: number, iceAmount: number};
    private sellingPricePerCup: number;

    constructor(cashBalance: number, inventory: {lemons: number; sugar: number; cups: number}, recipe: {lemonAmount: number, sugarAmount: number, waterAmount: number, iceAmount: number}, sellingPricePerCup: number) {
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
    setSellingPricePerCup(price: number) {
        this.sellingPricePerCup = price;
    }
    costPerCup(costs: {lemonCost: number, sugarCost: number, cupCost: number}) : number {
        return costs.lemonCost * this.recipe.lemonAmount + costs.sugarCost * this.recipe.sugarAmount + costs.cupCost;
    }

    // Returns number of lemonade cups worth of supplies successfully added to inventory
    increaseInventory(numberOfCupsIncrease: number, costs: {lemonCost: number, sugarCost: number, cupCost: number}) : number {
        let charge = numberOfCupsIncrease * this.costPerCup(costs);; // ice and water are free

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
    sellLemonade(cupsSold: number) : number {
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
    inventoryToNumberOfLemonadeCups() : number {
        // More rigorous inventory check to support if we wanted separate purchasing logic
        // for each ingredient as an extension in the future
        let cupsWorthOfLemon = this.inventory.lemons / this.recipe.lemonAmount;
        let cupsWorthOfSugar = this.inventory.sugar / this.recipe.sugarAmount;

        return Math.min(this.inventory.cups, Math.min(cupsWorthOfLemon, cupsWorthOfSugar));
    }
}

// Entry point: after every class is declared, so Day and LemonadeStand exist when Game uses them
new Game(10).run();
