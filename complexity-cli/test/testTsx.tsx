import React, { useCallback } from "react";
import { useImmer } from "use-immer";

type KeyType = "name" | "id";

interface IProps {
  keyType: KeyType;
  valueKey?: String;
  value: any;
  onChange: () => void;
}

const CertListSelect = (props: IProps) => {
  const { valueKey = "id", keyType } = props;
  const [state, setState] = useImmer({
    options: [],
    fetching: false,
  });

  const handleSearch = async (value: string) => {
    const basicQueryParam = {
      pageInfo: {
        currentPage: 1,
        pageSize: 50,
      },
    };
    let param;
    if (keyType === "name") {
      param = {
        ...basicQueryParam,
        diplomaName: value,
      };
    } else {
      param = {
        ...basicQueryParam,
        id: Number(value),
      };
    }
    try {
      const resp: any = {};
      if (resp.result === 1) {
        setState((draft) => {
          draft.options = resp.data || [];
        });
      }
    } catch (error) {
    } finally {
      setState((draft) => {
        draft.fetching = false;
      });
    }
  };

  const deboucedSearch = useCallback((value: string) => {
    handleSearch(value);
  }, []);

  const defaultProps = {
    placeholder: `请输入证书${keyType === "name" ? "名称" : "ID"}`,
    showSearch: true,
    notFoundContent: state.fetching ? <div /> : null,
    filterOption: false,
    onSearch: deboucedSearch,
    value: props.value,
    allowClear: true,
    onChange: props.onChange,
    style: { width: "100%" },
  };

  const mergedProps = {
    ...defaultProps,
    ...props,
  };

  return (
    <div {...mergedProps}>
      {state.options.map((item) => (
        // @ts-ignore
        <div key={item[valueKey]} value={item[valueKey]}>
          {(item as any).diplomaName}
        </div>
      ))}
    </div>
  );
};

export default CertListSelect;
