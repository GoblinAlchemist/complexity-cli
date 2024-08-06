import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PermissionWrap, hasPermission } from '@upm/upm-react';
import { SearchForm, FormItemListProps } from '@kast/biz-components';
import { Button, Card, Form, Input, Table, Space, Tabs, Modal } from 'm-ui';
import GlobalEnumSelect from 'components/global-enum-select';
import {
  getLecturerUsingPOST,
  listLecturerUsingPOST,
  updateLecturerStatusUsingPOST,
} from '@ad/knowledge-shared/src/manageApis/ad-knowledge-lecturer-controller';
import { transformEnum } from '@ad/knowledge-shared/src/utils/filter-object';
import OwnerSelect from '@ad/knowledge-shared/src/components/owner-select';
import RangePickerLimitTime from 'components/range-picker-limit-time';
import CertificateModal from 'components/certificate-modal';
import {
  ILecturerBaseInfoView,
  ILecturerListView,
  IPageInfo,
} from '@ad/knowledge-shared/src/manageApis/models';
import { NormalListLine } from '@m-ui/icons';
import { batchGetMetadataEnumInfoUsingPOST } from '@ad/knowledge-shared/src/manageApis/metadata-controller';
import TeacherBatchImport from 'components/import-teachers';
import CreateTeacherModal from 'components/create-teacher';
import { getTeachersListConfig } from './config';
import { ETeacherStatus, ETeachers, EIssuingStatus } from '../enum';
import { Moment } from 'moment';

import './index.less';

const { useForm } = Form;
const TabPane = Tabs.TabPane;
const prefix = 'teacher-list';
const teacherEnum = transformEnum(ETeachers);
const teacherStatus = transformEnum(ETeacherStatus);
// 证书状态
const issuingStatusEnum = transformEnum(EIssuingStatus);

const ManageTeacherList: React.FC<any> = () => {
  const [form] = useForm();
  const [tableList, setTable] = useState<Array<ILecturerListView>>([]);
  const [tableLoading, setTableLoading] = useState<boolean>(true);
  const [placeholderStr, setplaceHolder] = useState<string>('请输入讲师姓名');
  const [searchName, setName] = useState<string>('realName');
  const [selectedRows, setSelectedRows] = useState<ILecturerListView[]>([]);
  const [levelList, setLevelList] = useState<{ [key: number]: string }>([]);
  const [industryList, setIndustryList] = useState<{ [key: number]: string }>([]);
  const [fieldList, setFieldList] = useState<{ [key: number]: string }>([]);
  const [teacherSearchValue, setSearchValue] = useState<string>();
  const [dates, setDates] = useState<Moment[]>([]);
  const [diplomaUrl, setShowDiploma] = useState<string>();
  // 1：内部讲师，2：内部讲师，3：特邀讲师
  const [visibleStatus, setVisibleStatus] = useState<number>(1);
  const [pagination, setPagination] = useState<IPageInfo>({
    pageSize: 10,
    currentPage: 1,
    totalCount: 0,
  });
  const createRef = useRef<{ open: (val?: ILecturerBaseInfoView) => void; close: () => void }>(
    null,
  );
  const importRef = useRef<{ open: () => void; close: () => void }>(null);
  const certificateRef = useRef<{ open: (ids: number[]) => void; close: () => void }>(null);

  const batchGetEnum = useCallback(async () => {
    const { data } = await batchGetMetadataEnumInfoUsingPOST({ param: { types: ['1', '2', '3'] } });
    const levels: { [key: number]: string } = {},
      industrys: { [key: number]: string } = {},
      fields: { [key: number]: string } = {};
    data?.[1]?.forEach(f => (levels[f.id] = f.desc));
    data?.[3]?.forEach(f => (industrys[f.id] = f.desc));
    data?.[2]?.forEach(f => (fields[f.id] = f.desc));

    setLevelList(levels);
    setIndustryList(industrys);
    setFieldList(fields);
  }, [setLevelList, setIndustryList, setFieldList]);

  const formatPlaceHolder = useCallback(
    (searchType?: number) => {
      switch (searchType) {
        case 0:
          setplaceHolder('请输入讲师姓名');
          setName('realName');
          break;
        case 1:
          setplaceHolder('请输入讲师邮箱前缀');
          setName('email');
          break;
        case 2:
          setplaceHolder('请输入讲师ID');
          setName('id');
          break;
        case 3:
          setplaceHolder('请输入讲师快手ID');
          setName('userId');
          break;
        default:
          setplaceHolder('请输入讲师姓名');
          setName('realName');
          break;
      }
    },
    [setplaceHolder],
  );

  const editTeacher = async (id: number) => {
    const { data } = await getLecturerUsingPOST({ id });
    createRef?.current?.open(data);
  };
  const sendCertificate = (id: number) => {
    certificateRef?.current?.open([id]);
  };
  const changeStatus = async (id: number, status: number) => {
    const newStatus = status ? 0 : 1;
    await updateLecturerStatusUsingPOST({ param: { id, status: newStatus } });
    setTableLoading(true);
  };

  const formatParams = () => {
    const values = { ...form.getFieldsValue() };
    const searchType = values?.teacher?.searchType || 0;
    const [startCreateTime, endCreateTime] = (values?.createTime || [])?.map((f: Moment) =>
      f.valueOf(),
    );
    values[searchName] = teacherSearchValue;
    values['startCreateTime'] = startCreateTime;
    values['endCreateTime'] = endCreateTime;
    values['types'] = [+visibleStatus];
    delete values?.teacher;
    delete values?.createTime;

    return { ...values };
  };

  const fetchValue = useCallback(async () => {
    try {
      const { data, pageInfo } = await listLecturerUsingPOST({
        param: {
          ...formatParams(),
          pageInfo: pagination,
        },
      });
      setTable(data);
      setPagination(pageInfo);
      setTableLoading(false);
    } catch (error) {
      setTable([]);
      setPagination({
        pageSize: 10,
        currentPage: 1,
        totalCount: 0,
      });
      setTableLoading(false);
    }
  }, [
    form,
    teacherSearchValue,
    visibleStatus,
    searchName,
    setTableLoading,
    setPagination,
    setTable,
    pagination,
  ]);

  const preview = useCallback(
    (url: string) => {
      setShowDiploma(url);
    },
    [setShowDiploma],
  );

  const formList: FormItemListProps[] = useMemo(() => {
    return [
      {
        label: '讲师',
        name: 'teacher',
        children: () => (
          <Input.Group compact style={{ display: 'flex', marginBottom: 0 }}>
            <GlobalEnumSelect
              enum={teacherEnum}
              dropdownMatchSelectWidth={false}
              defaultValue={0}
              onChange={val => {
                form.setFieldsValue({
                  teacher: {
                    searchType: val,
                  },
                });
                setSearchValue('');
                formatPlaceHolder(val as number);
              }}
            />

            <Input
              key="teacherSearch"
              allowClear
              placeholder={placeholderStr}
              value={teacherSearchValue}
              onChange={e => {
                const value = e.target.value;
                setSearchValue(value);
              }}
            />
          </Input.Group>
        ),
      },
      {
        label: '讲师等级',
        name: 'levels',
        children: () => (
          <GlobalEnumSelect
            mode="multiple"
            allowClear
            enum={levelList}
            dropdownMatchSelectWidth={false}
          />
        ),
      },
      {
        label: '启用状态',
        name: 'status',
        children: () => (
          <GlobalEnumSelect allowClear enum={teacherStatus} dropdownMatchSelectWidth={false} />
        ),
      },
      {
        label: '擅长行业',
        name: 'goodAtIndustry',
        children: () => (
          <GlobalEnumSelect
            mode="multiple"
            maxTagCount={3}
            allowClear
            enum={industryList}
            dropdownMatchSelectWidth={false}
          />
        ),
      },
      {
        label: '擅长领域',
        name: 'goodAtField',
        children: () => (
          <GlobalEnumSelect
            maxTagCount={3}
            mode="multiple"
            allowClear
            enum={fieldList}
            dropdownMatchSelectWidth={false}
          />
        ),
      },
      {
        label: '负责人',
        name: 'owner',
        children: () => (
          <OwnerSelect allowClear mode={undefined} placeholder={'请输入邮箱前缀'}></OwnerSelect>
        ),
      },
      {
        label: '创建时间',
        name: 'createTime',
        children: () => (
          <RangePickerLimitTime
            limitDays={180}
            style={{ width: '100%' }}
            placeholder={['开始时间', '结束时间']}
            showTime
            allowClear
          />
        ),
      },
      {
        label: '证书状态',
        name: 'issuingStatus',
        children: () => (
          <GlobalEnumSelect allowClear enum={issuingStatusEnum} dropdownMatchSelectWidth={false} />
        ),
      },
    ];
  }, [
    setSearchValue,
    teacherSearchValue,
    placeholderStr,
    levelList,
    industryList,
    fieldList,
    formatPlaceHolder,
    form,
  ]);

  useEffect(() => {
    batchGetEnum();
  }, []);

  useEffect(() => {
    if (tableLoading) {
      fetchValue();
    }
  }, [tableLoading]);

  return (
    <div className={prefix}>
      <Card style={{ marginBottom: 24 }}>
        <SearchForm
          formItemList={formList}
          formProps={{
            labelCol: { span: 5 },
            form,
          }}
          onReset={() => {
            form.resetFields();
            setSearchValue('');
            setTableLoading(true);
          }}
          onSubmit={() => {
            setTableLoading(true);
          }}
        />
      </Card>

      <div className={`${prefix}-list`}>
        <div className={`${prefix}-list-box`}>
          <div className={`${prefix}-list-banner-top`}>
            <div className={`${prefix}-list-banner-top-left`}>
              <Tabs
                style={{ background: '#fff', padding: '24px 24px 0' }}
                defaultValue={1}
                onChange={value => {
                  setSelectedRows([]);
                  if ((value as any) !== visibleStatus) {
                    setVisibleStatus(value as any);
                    if (pagination.currentPage !== 1) {
                      setPagination({
                        ...pagination,
                        currentPage: 1,
                      });
                    } else {
                      form.submit();
                    }
                  }
                  setTableLoading(true);
                }}
                tabBarExtraContent={
                  <Space direction="horizontal">
                    <div className={`${prefix}-list-already-chosen`}>
                      <span>已选：{selectedRows.length}条&nbsp; &nbsp; </span>
                    </div>
                    {/* @ts-ignore */}
                    <PermissionWrap resourceName="讲师列表-批量颁发">
                      <Button
                        onClick={() => {
                          certificateRef?.current?.open(selectedRows?.map(f => f.id) || []);
                        }}
                        disabled={selectedRows?.length <= 0}
                      >
                        批量颁发证书
                      </Button>
                    </PermissionWrap>
                    <Button onClick={() => importRef?.current?.open()}>导入讲师</Button>
                    <Button
                      type="primary"
                      className="search-btn-create"
                      icon={<NormalListLine />}
                      style={{ marginLeft: 8 }}
                      onClick={() => createRef?.current?.open({ type: +visibleStatus } as any)}
                    >
                      新建讲师
                    </Button>
                  </Space>
                }
              >
                <TabPane tab="内部讲师" key={1} />
                <TabPane tab="外部讲师" key={2} />
                <TabPane tab="特邀讲师" key={3} />
              </Tabs>
            </div>
          </div>
          <Card style={{ border: 'none' }} bodyStyle={{ paddingTop: 0 }}>
            <Table
              columns={getTeachersListConfig({
                levels: levelList,
                fields: fieldList,
                industrys: industryList,
                editTeacher,
                sendCertificate,
                changeStatus,
                preview,
              })}
              rowKey="id"
              loading={tableLoading}
              dataSource={tableList}
              rowSelection={{
                preserveSelectedRowKeys: true,
                onChange: (selectedRowKeys: React.Key[], selectedRows: ILecturerListView[]) => {
                  setSelectedRows(selectedRows);
                },
              }}
              scroll={{ x: 'max-content' }}
              pagination={{
                pageSize: pagination.pageSize,
                defaultPageSize: pagination.pageSize,
                current: pagination.currentPage,
                total: pagination.totalCount,
                showTotal: (total: number) => `共${total}条`,
                onChange: (page: number, pageSize: number) => {
                  setPagination({ ...pagination, currentPage: page, pageSize: pageSize });
                  setTableLoading(true);
                },
                showQuickJumper: true,
                showSizeChanger: true,
              }}
            />
          </Card>
        </div>
      </div>
      <CreateTeacherModal ref={createRef} cb={() => setTableLoading(true)} />
      <TeacherBatchImport ref={importRef} cb={() => setTableLoading(true)} />
      <CertificateModal ref={certificateRef} cb={() => setTableLoading(true)} />
      <Modal
        title="查看证书"
        visible={!!diplomaUrl}
        width={880}
        onOk={() => setShowDiploma('')}
        onCancel={() => setShowDiploma('')}
      >
        <img style={{ width: '100%' }} src={diplomaUrl} alt="" />
      </Modal>
    </div>
  );
};

export default ManageTeacherList;
