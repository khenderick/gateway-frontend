import time
import requests
import os
from selenium import webdriver
from helper import Helper

OM_CICD = 'cicd1'
OM_BROWSERSTACK_TOKEN = os.environ['OM_BS_TOKEN']
OM_TESTER_USERNAME = os.environ['OM_TESTEE_USERNAME']
OM_TESTER_PASSWORD = os.environ['OM_TESTEE_PASSWORD']
OM_TESTEE_AUTHORIZED_OUTPUT_ID = 13


def test_the_title_is_openmotics():
    my_helper = Helper('localhost:8088', 'localhost:8089', 10)

    desired_cap = {'os': 'Windows',
                   'os_version': '10',
                   'browser': 'Chrome',
                   'browser_version': '70.0',
                   'project': 'LocalUpdated',
                   'build': 'Build 1.0',
                   'browserstack.debug': 'true',
                   'browserstack.local': 'true',
                   'browserstack.selenium_version': '3.14.0',
                   'browserstack.chrome.driver': '2.43'}

    driver = webdriver.Remote(
        command_executor='http://{0}:{1}@hub.browserstack.com:80/wd/hub'.format(OM_CICD, OM_BROWSERSTACK_TOKEN),
        desired_capabilities=desired_cap)

    driver.get("https://{0}/".format(my_helper.testee_ip))
    driver.implicitly_wait(my_helper.global_timeout)  # Wait for page to finish rendering

    elem = my_helper.find_element_where("id=login.create", driver)
    elem.click()

    token = my_helper.get_new_tester_token(OM_TESTER_USERNAME, OM_TESTER_PASSWORD)
    start = time.time()

    params = {'id': OM_TESTEE_AUTHORIZED_OUTPUT_ID, 'is_on': True}
    my_helper.test_platform_caller(api='set_output', params=params, token=token)
    while time.time() - start <= 6.5:
        time.sleep(0.5)

    params = {'id': OM_TESTEE_AUTHORIZED_OUTPUT_ID, 'is_on': False}
    my_helper.test_platform_caller(api='set_output', params=params, token=token)

    assert "OpenMotics" in driver.title
    elem = my_helper.find_element_where('id=create.username', driver)
    elem.send_keys("automatedusername")

    elem = my_helper.find_element_where('id=create.password', driver)
    elem.send_keys("automatedpassword")

    elem = my_helper.find_element_where('id=create.confirmpassword', driver)
    elem.send_keys("automatedpassword")

    elem = my_helper.find_element_where('id=create.create', driver)
    elem.click()

    elem = my_helper.find_element_where('id=create.havelogin', driver)
    elem.click()

    elem = my_helper.find_element_where('id=login.username', driver)
    elem.send_keys("automatedusername")

    elem = my_helper.find_element_where('id=login.password', driver)
    elem.send_keys("automatedpassword")

    elem = my_helper.find_element_where('id=login.signin', driver)
    elem.click()

    elem = my_helper.find_element_where('id=login.acceptterms', driver)
    elem.click()

    elem = my_helper.find_element_where('id=login.signin', driver)
    elem.click()

    driver.implicitly_wait(my_helper.global_timeout)  # Wait for page to finish rendering

    assert "OpenMotics" in driver.title

    # This is where you tell Browser Stack to stop running tests on your behalf.
    # It's important so that you aren't billed after your test finishes.
    driver.quit()
