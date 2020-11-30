pipeline {
    agent {
        dockerfile {
            filename 'docker/test/Dockerfile'
        }
    }
    options {
        timeout(time: 10, unit: 'MINUTES')
        buildDiscarder(logRotator(
            artifactNumToKeepStr: '32',
            numToKeepStr: '64'
        ))
    }
    stages {
        stage('Run tests') {
            steps {
                sh '''
                ln -sfn /app/node_modules .
                npm run test
                '''
            }
            post {
                always {
                    junit 'junit.xml'
                }
            }
        }

        stage('Build container') {
            when {
                anyOf {
                    branch 'master'
                    branch 'develop'
                }
            }
            steps {
                script {
                    build(job: 'frontend-container-builder', wait: false, parameters: [
                        [$class: 'StringParameterValue', name: 'BRANCH_NAME', value: env.BRANCH_NAME],
                        [$class: 'StringParameterValue', name: 'GIT_COMMIT', value: env.GIT_COMMIT],
                    ])
                }
            }
        }
    }
}

