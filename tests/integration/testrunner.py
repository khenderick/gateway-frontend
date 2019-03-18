import unittest
import importlib
import xmlrunner
import os
import sys
import simplejson as json
import threading
from selenium import webdriver

OM_CICD = 'cicd1'
OM_BROWSERSTACK_TOKEN = os.environ['OM_BS_TOKEN']


class TestRunner(object):

    @staticmethod
    def load_tests(test_set):
        """
        Used to run the list of tests.
        :param test_set: The list of tests to run
        :type test_set: str
        """
        current_path = os.path.dirname(os.path.abspath(__file__))
        sys.path.insert(0, '{0}/tests/'.format(current_path))

        with open('sets/{0}.json'.format(test_set)) as f:
            loaded_environment_data = json.load(f)

        list_desired_cap = loaded_environment_data['capabilities']

        tests = loaded_environment_data['tests']

        jobs = []

        for capability in list_desired_cap:

            with open('capabilities/{0}.json'.format(capability)) as f:
                loaded_environment_data = json.load(f)
            driver = webdriver.Remote(
                command_executor='http://{0}:{1}@hub.browserstack.com:80/wd/hub'.format(OM_CICD, OM_BROWSERSTACK_TOKEN),
                desired_capabilities=loaded_environment_data['desired_capabilities'])
            thread = threading.Thread(target=TestRunner.run_test(tests, driver))
            jobs.append(thread)

        for j in jobs:
            j.start()

        for j in jobs:
            j.join()

    @staticmethod
    def run_test(tests, driver):
        try:
            suite1 = unittest.TestSuite()
            for test in tests:
                test = test.strip()
                file_name, test_name = test.split('.')
                test_class = TestRunner._import_generate_test_name(file_name, driver)
                if hasattr(test_class, test_name):
                    suite1.addTest(test_class(test_name))
            with open('/tmp/FE-test-reports.xml', 'wb') as output:
                runner = xmlrunner.XMLTestRunner(output=output)
                alltests = unittest.TestSuite([suite1])
                runner.run(alltests)
        except Exception as ex:
            pass

    @staticmethod
    def _import_generate_test_name(file_name, driver):
        file_name_list = list(file_name)
        for i, character in enumerate(file_name_list):
            if i == 0:
                file_name_list[i] = character.upper()
            if character == '_':
                file_name_list[i + 1] = file_name_list[i + 1].upper()
                file_name_list[i] = ''
        module_name = ''.join(file_name_list)
        imported_test = importlib.import_module("{0}".format(file_name))
        reload(imported_test)
        test_class = getattr(imported_test, module_name)
        test_class.driver = driver
        return test_class


if __name__ == '__main__':
    TestRunner.load_tests(os.environ['TARGET_SET'])
