def execute(input_params, socket_comm):
    """
    It reports whether the runner holds a script socket and whether writing to it succeeds
    :param dict input_params: Input parameters object
    :param socket_comm: Socket communication object
    :return: Execution result object
    :rtype: dict
    """
    result = {'success': False, 'hasSocket': socket_comm is not None}
    try:
        socket_comm.write('ping')
        result['success'] = True
    except Exception as error:
        result['errorMessage'] = str(error)
    return result
