module.exports = {
    apps: [{
        name: 'hey-bobby',
        script: 'server.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'development',
            PORT: 8080
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: 8080
        }
    }]
}
