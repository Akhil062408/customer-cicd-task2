pipeline {

    agent any

    parameters {

        choice(
            name: 'ENVIRONMENT',
            choices: ['DEV', 'UAT', 'PRODUCTION'],
            description: 'Select deployment environment'
        )

        choice(
            name: 'ACTION',
            choices: ['DEPLOY', 'ROLLBACK'],
            description: 'Select deployment action'
        )

        string(
            name: 'VERSION',
            defaultValue: '1.0',
            trim: true,
            description: 'Docker image version'
        )

        choice(
            name: 'RUN_TESTS',
            choices: ['YES', 'NO'],
            description: 'Run application tests'
        )

        booleanParam(
            name: 'PRODUCTION_CONFIRM',
            defaultValue: false,
            description: 'Required confirmation for production deployment'
        )
    }

    environment {

        IMAGE_REPOSITORY = 'customer-app'

        DB_CREDENTIALS_ID = 'customer-db-credentials'
    }

    stages {

        // =====================================================
        // 1. RESOLVE ENVIRONMENT
        // =====================================================

        stage('Resolve Deployment Configuration') {

            steps {

                script {

                    def configurations = [

                        DEV: [
                            branch: 'develop',
                            app: 'customer-app-dev',
                            port: '8081',
                            network: 'customer-dev-net',
                            db: 'customer-db-dev',
                            volume: 'customer-db-dev-data',
                            environment: 'DEV'
                        ],

                        UAT: [
                            branch: 'release',
                            app: 'customer-app-uat',
                            port: '8082',
                            network: 'customer-uat-net',
                            db: 'customer-db-uat',
                            volume: 'customer-db-uat-data',
                            environment: 'UAT'
                        ],

                        PRODUCTION: [
                            branch: 'main',
                            app: 'customer-app-prod',
                            port: '8083',
                            network: 'customer-prod-net',
                            db: 'customer-db-prod',
                            volume: 'customer-db-prod-data',
                            environment: 'PRODUCTION'
                        ]
                    ]

                    def config = configurations[params.ENVIRONMENT]

                    // -------------------------------
                    // Validate environment
                    // -------------------------------

                    if (config == null) {
                        error(
                            "Invalid environment: ${params.ENVIRONMENT}"
                        )
                    }

                    // -------------------------------
                    // Validate version
                    // -------------------------------

                    if (!params.VERSION?.trim()) {
                        error("VERSION cannot be empty")
                    }

                    // -------------------------------
                    // Rollback only production
                    // -------------------------------

                    if (
                        params.ACTION == 'ROLLBACK' &&
                        params.ENVIRONMENT != 'PRODUCTION'
                    ) {

                        error(
                            "ROLLBACK is allowed only for PRODUCTION"
                        )
                    }

                    // -------------------------------
                    // Production confirmation
                    // -------------------------------

                    if (
                        params.ENVIRONMENT == 'PRODUCTION' &&
                        !params.PRODUCTION_CONFIRM
                    ) {

                        error(
                            "Production deployment requires PRODUCTION_CONFIRM=true"
                        )
                    }

                    // -------------------------------
                    // Store resolved configuration
                    // -------------------------------

                    env.DEPLOY_BRANCH =
                        config.branch

                    env.APP_NAME =
                        config.app

                    env.HOST_PORT =
                        config.port

                    env.DOCKER_NETWORK =
                        config.network

                    env.DB_CONTAINER =
                        config.db

                    env.DB_VOLUME =
                        config.volume

                    env.APP_ENV =
                        config.environment

                    env.IMAGE =
                        "${env.IMAGE_REPOSITORY}:${params.VERSION}"

                    // -------------------------------
                    // Print configuration
                    // -------------------------------

                    echo """
============================================================
        RESOLVED DEPLOYMENT CONFIGURATION
============================================================

ENVIRONMENT       : ${params.ENVIRONMENT}
ACTION            : ${params.ACTION}
VERSION           : ${params.VERSION}

GIT BRANCH        : ${env.DEPLOY_BRANCH}

DOCKER IMAGE      : ${env.IMAGE}

APP CONTAINER     : ${env.APP_NAME}

HOST PORT         : ${env.HOST_PORT}

CONTAINER PORT    : 8080

DOCKER NETWORK    : ${env.DOCKER_NETWORK}

DATABASE CONTAINER: ${env.DB_CONTAINER}

DATABASE VOLUME   : ${env.DB_VOLUME}

APP ENVIRONMENT   : ${env.APP_ENV}

============================================================
"""
                }
            }
        }


        // =====================================================
        // 2. CHECKOUT
        // =====================================================

        stage('Checkout Correct Branch') {

            steps {

                echo "Checking out branch: ${env.DEPLOY_BRANCH}"

                git branch: env.DEPLOY_BRANCH,
                    url: 'https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git'

                bat 'git branch --show-current'

                bat 'git log -1 --oneline'
            }
        }


        // =====================================================
        // 3. RUN TESTS
        // =====================================================

        stage('Run Tests') {

            when {

                expression {

                    params.RUN_TESTS == 'YES'
                }
            }

            steps {

                echo "Running application tests..."

                bat '''
                    docker run --rm ^
                    -v "%CD%\\app:/app" ^
                    -w /app ^
                    node:20-alpine ^
                    sh -c "npm install && npm test"
                '''
            }
        }


        // =====================================================
        // 4. BUILD DOCKER IMAGE
        // =====================================================

        stage('Build Docker Image') {

            when {

                expression {

                    params.ACTION == 'DEPLOY'
                }
            }

            steps {

                echo "Building Docker image..."

                bat """
                    docker build ^
                    -t ${env.IMAGE} ^
                    .\\app
                """

                echo "Checking Docker image..."

                bat """
                    docker image inspect ${env.IMAGE}
                """
            }
        }


        // =====================================================
        // 5. CREATE NETWORK
        // =====================================================

        stage('Create Docker Network') {

            steps {

                bat """
                    docker network inspect ${env.DOCKER_NETWORK} >nul 2>&1 || ^
                    docker network create ${env.DOCKER_NETWORK}
                """

                echo "Network ready: ${env.DOCKER_NETWORK}"
            }
        }


        // =====================================================
        // 6. CREATE DATABASE VOLUME
        // =====================================================

        stage('Create Database Volume') {

            steps {

                bat """
                    docker volume inspect ${env.DB_VOLUME} >nul 2>&1 || ^
                    docker volume create ${env.DB_VOLUME}
                """

                echo "Database volume ready: ${env.DB_VOLUME}"
            }
        }


        // =====================================================
        // 7. DEPLOY DATABASE
        // =====================================================

        stage('Deploy Database') {

            steps {

                withCredentials(
                    [
                        usernamePassword(
                            credentialsId: env.DB_CREDENTIALS_ID,
                            usernameVariable: 'DB_USER',
                            passwordVariable: 'DB_PASSWORD'
                        )
                    ]
                ) {

                    bat """
                        docker rm -f ${env.DB_CONTAINER} >nul 2>&1 || exit /b 0

                        docker run -d ^
                        --name ${env.DB_CONTAINER} ^
                        --network ${env.DOCKER_NETWORK} ^
                        -e MYSQL_ROOT_PASSWORD=%DB_PASSWORD% ^
                        -e MYSQL_DATABASE=customerdb ^
                        -e MYSQL_USER=%DB_USER% ^
                        -e MYSQL_PASSWORD=%DB_PASSWORD% ^
                        -v ${env.DB_VOLUME}:/var/lib/mysql ^
                        mysql:8.4
                    """

                    echo "Database container started."

                    bat 'timeout /t 20 /nobreak'
                }
            }
        }

        // =====================================================
        // 8. DEPLOY APPLICATION
        // =====================================================

        stage('Deploy Application') {

            when {

                expression {

                    params.ACTION == 'DEPLOY'
                }
            }

            steps {

                withCredentials(
                    [
                        usernamePassword(
                            credentialsId:
                                env.DB_CREDENTIALS_ID,

                            usernameVariable:
                                'DB_USER',

                            passwordVariable:
                                'DB_PASSWORD'
                        )
                    ]
                ) {

                    bat """
                        docker rm -f ${env.APP_NAME} >nul 2>&1 || exit /b 0

                        docker run -d ^
                        --name ${env.APP_NAME} ^
                        --network ${env.DOCKER_NETWORK} ^
                        -p ${env.HOST_PORT}:8080 ^
                        -e APP_ENV=${env.APP_ENV} ^
                        -e APP_VERSION=${params.VERSION} ^
                        -e DB_HOST=${env.DB_CONTAINER} ^
                        -e DB_PORT=3306 ^
                        -e DB_NAME=customerdb ^
                        -e DB_USER=%DB_USER% ^
                        -e DB_PASSWORD=%DB_PASSWORD% ^
                        ${env.IMAGE}
                    """
                }

                echo "Application container started."
            }
        }


        // =====================================================
        // 9. VALIDATE DEPLOYMENT
        // =====================================================

        stage('Validate Deployment') {

            steps {

                script {

                    echo "Starting deployment validation..."

                    // Image validation

                    bat """
                        docker image inspect ${env.IMAGE}
                    """

                    // Application container

                    bat """
                        docker ps ^
                        --filter "name=${env.APP_NAME}"
                    """

                    // Database container

                    bat """
                        docker ps ^
                        --filter "name=${env.DB_CONTAINER}"
                    """

                    // Network validation

                    bat """
                        docker network inspect ${env.DOCKER_NETWORK}
                    """

                    // Container logs

                    bat """
                        docker logs ${env.APP_NAME}
                    """

                    // Health check

                    bat """
                        curl.exe ^
                        -f ^
                        http://localhost:${env.HOST_PORT}/health
                    """

                    // Environment validation

                    bat """
                        curl.exe ^
                        -f ^
                        http://localhost:${env.HOST_PORT}/info
                    """

                    // DB DNS validation

                    bat """
                        docker exec ${env.APP_NAME} ^
                        node -e "require('dns').lookup('${env.DB_CONTAINER}',(e,a)=>{if(e){console.error(e);process.exit(1)};console.log('DB DNS OK: '+a)})"
                    """

                    // DB TCP validation

                    bat """
                        docker exec ${env.APP_NAME} ^
                        node -e "require('net').createConnection(3306,'${env.DB_CONTAINER}').on('connect',()=>{console.log('DB TCP OK');process.exit(0)}).on('error',e=>{console.error(e);process.exit(1)})"
                    """

                    echo "ALL DEPLOYMENT VALIDATIONS PASSED."
                }
            }
        }


        // =====================================================
        // 10. ROLLBACK
        // =====================================================

        stage('Rollback') {

            when {

                expression {

                    params.ACTION == 'ROLLBACK'
                }
            }

            steps {

                echo """
============================================================
                    ROLLBACK
============================================================

Restoring production version:
${params.VERSION}

============================================================
"""

                withCredentials(
                    [
                        usernamePassword(
                            credentialsId:
                                env.DB_CREDENTIALS_ID,

                            usernameVariable:
                                'DB_USER',

                            passwordVariable:
                                'DB_PASSWORD'
                        )
                    ]
                ) {

                    bat """
                        docker rm -f ${env.APP_NAME} >nul 2>&1 || exit /b 0

                        docker run -d ^
                        --name ${env.APP_NAME} ^
                        --network ${env.DOCKER_NETWORK} ^
                        -p ${env.HOST_PORT}:8080 ^
                        -e APP_ENV=${env.APP_ENV} ^
                        -e APP_VERSION=${params.VERSION} ^
                        -e DB_HOST=${env.DB_CONTAINER} ^
                        -e DB_PORT=3306 ^
                        -e DB_NAME=customerdb ^
                        -e DB_USER=%DB_USER% ^
                        -e DB_PASSWORD=%DB_PASSWORD% ^
                        ${env.IMAGE}

                        timeout /t 10 /nobreak
                    """

                    bat """
                        curl.exe ^
                        -f ^
                        http://localhost:${env.HOST_PORT}/health
                    """
                }

                echo "ROLLBACK VALIDATION PASSED."
            }
        }
    }


    // =====================================================
    // POST ACTIONS
    // =====================================================

    post {

        success {

            echo """
============================================================
FINAL RESULT = SUCCESS
============================================================

Environment : ${params.ENVIRONMENT}
Action      : ${params.ACTION}
Version     : ${params.VERSION}

============================================================
"""
        }

        failure {

            echo """
============================================================
FINAL RESULT = FAILURE
============================================================

Environment : ${params.ENVIRONMENT}
Action      : ${params.ACTION}
Version     : ${params.VERSION}

Deployment validation failed.

============================================================
"""
        }
    }
}