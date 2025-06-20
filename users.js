const users = [
    {
        username: 'ROD',
        password: 'rod2025',
        department: 'ROD',
        role: 'user'
    },
    {
        username: 'ORD',
        password: 'ord2025',
        department: 'ORD',
        role: 'user'
    },
    {
        username: 'FASD',
        password: 'fasd2025',
        department: 'FASD',
        role: 'user'
    },
    {
        username: 'admintesda',
        password: 'tesdaadmin',
        department: 'Administration',
        role: 'admin'
    }
];

// Function to validate user credentials
function validateUser(username, password) {
    const user = users.find(u => u.username === username && u.password === password);
    return user || null;
}

// Function to get user by username
function getUserByUsername(username) {
    return users.find(u => u.username === username) || null;
}

// Export the functions and users array
export { users, validateUser, getUserByUsername }; 