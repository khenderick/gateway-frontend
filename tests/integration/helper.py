import requests
from time import time, sleep


class Helper(object):

    def __init__(self, testee_ip, tester_ip, global_timeout):
        self.testee_ip = testee_ip
        self.tester_ip = tester_ip
        self.global_timeout = global_timeout

    @staticmethod
    def find_element_where(locator, browser):
        locator_type, locator_value = locator.split('=')
        if locator_type == 'id':
            return browser.find_element_by_id(locator_value)
        elif locator_type == 'class':
            return browser.find_element_by_class_name(locator_value)
        elif locator_type == 'css':
            return browser.find_element_by_css_selector(locator_value)
        elif locator_type == 'link':
            return browser.find_element_by_link_text(locator_value)
        elif locator_type == 'name':
            return browser.find_element_by_name(locator_value)
        elif locator_type == 'plink':
            return browser.find_element_by_partial_link_text(locator_value)
        elif locator_type == 'tag':
            return browser.find_element_by_tag_name(locator_value)
        elif locator_type == 'xpath':
            return browser.find_element_by_xpath(locator_value)

        else:
            raise Exception('Invalid locator given!')

    def test_platform_caller(self, api, params=None, token=None, is_testee=False):
        """
        Used to call APIs on the Tester
        :param api: URI to the target API on the Testee
        :type api: str
        :param params: A dict of parameters
        :type params: dict
        :param token: A valid token of a logged in user on the Testee
        :type token: str
        :param is_testee: Indicates if the target is the Testee or not (tester otherwise)
        :type is_testee: bool
        :return: API response
        :rtype: dict
        """
        header=None
        uri='https://{0}/{1}'.format(self.tester_ip if not is_testee else self.testee_ip, api)
        if token:
            header={'Authorization': 'Bearer {0}'.format(token)}       
        start = time()
        while time() - start <= self.global_timeout:
            if not header:
                response=requests.get(uri, verify=False, params=params or {})
            else:
                response=requests.get(uri, verify=False, headers=header, params=params or {})
            if not (response or response.json().get('success')):
                sleep(0.3)
                continue
            return response.json()

    def get_new_tester_token(self, username, password):
        params={'username': username, 'password': password, 'accept_terms': True}
        return self.test_platform_caller(api='login', params=params).get('token')
