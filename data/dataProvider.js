const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, 'users.json');
const coinsPath = path.join(__dirname, 'coins.json');

// Read users from JSON file
function getUsers() {
    try {
        const data = fs.readFileSync(usersPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading users.json:', error);
        return [];
    }
}

// Save users to JSON file
function saveUsers(users) {
    try {
        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error writing users.json:', error);
        return false;
    }
}

// Read coins from JSON file
function getCoins() {
    try {
        const data = fs.readFileSync(coinsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading coins.json:', error);
        return [];
    }
}

// Get current user (first user for demo purposes)
function getCurrentUser() {
    const users = getUsers();
    return users[0] || null;
}

// Get user by ID
function getUserById(id) {
    const users = getUsers();
    return users.find(u => u.id === id) || null;
}

// Get user by email
function getUserByEmail(email) {
    const users = getUsers();
    return users.find(u => u.email === email) || null;
}

module.exports = {
    getUsers,
    saveUsers,
    getCoins,
    getCurrentUser,
    getUserById,
    getUserByEmail
};
