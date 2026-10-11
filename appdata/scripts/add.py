def execute(input_params, socket_comm):
    """
    It returns the result of adding two values from the input argument
    :param dict input_params: Input parameters object
    :param socket_comm: Socket communication object
    :return: Execution result object
    :rtype: dict
    """
    result = {'success': False}
    try:
        result['Result'] = input_params['NumberA'] + input_params['NumberB']
        result['success'] = True
    except Exception as error:
        result['errorMessage'] = str(error)
    return result
